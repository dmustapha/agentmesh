// Debug Phase 4: E2E flow tests for full audit lifecycle
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRoutes } from './routes';
import type { AgentNode, AuditReport, Finding, ConsensusResult } from '@agentmesh/shared';

function createMockManager() {
  const mockAgents: AgentNode[] = [
    { id: 'agent-1', peerId: 'peer-1', ensName: 'reentrancy.agentmesh.eth', specialty: 'reentrancy', capabilities: ['reentrancy'], status: 'idle', axlPort: 9002 },
    { id: 'agent-2', peerId: 'peer-2', ensName: 'access.agentmesh.eth', specialty: 'access-control', capabilities: ['access-control'], status: 'idle', axlPort: 9003 },
    { id: 'agent-3', peerId: 'peer-3', ensName: 'logic.agentmesh.eth', specialty: 'logic', capabilities: ['logic'], status: 'idle', axlPort: 9004 },
    { id: 'agent-4', peerId: 'peer-4', ensName: 'economic.agentmesh.eth', specialty: 'economic', capabilities: ['economic'], status: 'idle', axlPort: 9005 },
  ];

  const reports = new Map<string, AuditReport>();

  return {
    getAgents: vi.fn().mockReturnValue(mockAgents),
    getTopology: vi.fn().mockResolvedValue({
      reentrancy: { peerId: 'peer-1', peers: ['peer-2', 'peer-3', 'peer-4'] },
      'access-control': { peerId: 'peer-2', peers: ['peer-1'] },
      logic: { peerId: 'peer-3', peers: ['peer-1'] },
      economic: { peerId: 'peer-4', peers: ['peer-1'] },
    }),
    runAudit: vi.fn().mockImplementation(async (req: any) => {
      const report: AuditReport = {
        id: req.id,
        request: req,
        consensus: {
          findings: [],
          totalAgents: 4,
          agreementRatio: 1,
          reportHash: '0x' + 'a'.repeat(64),
          storageRootHash: '',
          attestationTxHash: '',
          timestamp: Date.now(),
        },
        agents: mockAgents,
        duration: 5000,
        createdAt: Date.now(),
      };
      reports.set(req.id, report);
      return report;
    }),
    getAuditReport: vi.fn().mockImplementation((id: string) => reports.get(id) || null),
    getENSResolver: vi.fn().mockReturnValue({
      getVerificationProof: vi.fn().mockResolvedValue({ verified: true, ensName: 'reentrancy.agentmesh.eth' }),
    }),
  };
}

describe('E2E: Full Audit Lifecycle', () => {
  let app: express.Express;
  let manager: ReturnType<typeof createMockManager>;

  beforeEach(() => {
    manager = createMockManager();
    app = express();
    app.use(express.json({ limit: '5mb' }));
    app.use('/api', createRoutes(manager as any));
    app.get('/health', (_req, res) => res.json({ status: 'ok', agents: 4 }));
  });

  it('completes full demo flow: agents -> topology -> audit -> report', async () => {
    // Step 1: Check agents are online
    const agentsRes = await request(app).get('/api/agents');
    expect(agentsRes.status).toBe(200);
    expect(agentsRes.body.agents).toHaveLength(4);
    const specialties = agentsRes.body.agents.map((a: any) => a.specialty);
    expect(specialties).toContain('reentrancy');
    expect(specialties).toContain('access-control');
    expect(specialties).toContain('logic');
    expect(specialties).toContain('economic');

    // Step 2: Check mesh topology
    const topoRes = await request(app).get('/api/topology');
    expect(topoRes.status).toBe(200);
    expect(Object.keys(topoRes.body.topology)).toHaveLength(4);

    // Step 3: Submit audit with source code
    const auditRes = await request(app)
      .post('/api/audit')
      .send({ sourceCode: 'pragma solidity ^0.8.0; contract Vulnerable { function withdraw() external { msg.sender.call{value: address(this).balance}(""); } }' });
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.auditId).toBeDefined();
    expect(auditRes.body.status).toBe('started');

    // Wait for async audit to complete
    await new Promise(r => setTimeout(r, 100));

    // Step 4: Retrieve report
    const reportRes = await request(app).get(`/api/audit/${auditRes.body.auditId}`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.report).toBeDefined();
    expect(reportRes.body.report.consensus).toBeDefined();
    expect(reportRes.body.report.consensus.totalAgents).toBe(4);

    // Step 5: Verify proof page data
    const proofRes = await request(app).get('/api/proof');
    expect(proofRes.status).toBe(200);
    expect(proofRes.body.agents).toHaveLength(4);
    expect(proofRes.body.contracts).toBeDefined();
    expect(proofRes.body.ens).toBeDefined();
  });

  it('handles error recovery: invalid input then valid input', async () => {
    // Bad request
    const badRes = await request(app).post('/api/audit').send({});
    expect(badRes.status).toBe(400);

    // Recover with good request
    const goodRes = await request(app)
      .post('/api/audit')
      .send({ sourceCode: 'pragma solidity ^0.8.0; contract Safe { uint256 public x; }' });
    expect(goodRes.status).toBe(200);
    expect(goodRes.body.auditId).toBeDefined();
  });

  it('agent tools endpoint returns MCP-compatible schema', async () => {
    const res = await request(app).get('/api/agents/tools');
    expect(res.status).toBe(200);
    expect(res.body.agents).toHaveLength(4);

    for (const agent of res.body.agents) {
      expect(agent.tools).toHaveLength(1);
      expect(agent.tools[0].name).toMatch(/^audit_/);
      expect(agent.tools[0].inputSchema).toBeDefined();
      expect(agent.tools[0].inputSchema.type).toBe('object');
      expect(agent.tools[0].inputSchema.properties.contract).toBeDefined();
    }
  });

  it('agent verification returns proof', async () => {
    const res = await request(app).get('/api/agents/verify/agent-1');
    expect(res.status).toBe(200);
    expect(res.body.proof).toBeDefined();
    expect(res.body.agentId).toBe('agent-1');
  });

  it('rejects malformed contract address in audit', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ contractAddress: 'not-hex' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid/);
  });

  it('rate limits audit endpoint', async () => {
    // Submit 6 audits rapidly (limit is 5/min)
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/audit')
        .send({ sourceCode: `pragma solidity ^0.8.0; contract Test${i} { uint256 x; }` });
      expect(res.status).toBe(200);
    }

    // 6th should be rate limited
    const res = await request(app)
      .post('/api/audit')
      .send({ sourceCode: 'pragma solidity ^0.8.0; contract Test6 { uint256 x; }' });
    expect(res.status).toBe(429);
  });
});
