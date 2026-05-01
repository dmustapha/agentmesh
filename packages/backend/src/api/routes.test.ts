// Tests for API routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRoutes } from './routes';
import type { AgentNode, AuditReport } from '@agentmesh/shared';

// Mock AgentManager
function createMockManager() {
  const mockAgents: AgentNode[] = [
    {
      id: 'agent-1',
      peerId: 'peer-reentrancy-9002',
      ensName: 'reentrancy.agentmesh.eth',
      specialty: 'reentrancy',
      capabilities: ['reentrancy'],
      status: 'idle',
      axlPort: 9002,
    },
    {
      id: 'agent-2',
      peerId: 'peer-access-9003',
      ensName: 'access.agentmesh.eth',
      specialty: 'access-control',
      capabilities: ['access-control'],
      status: 'idle',
      axlPort: 9003,
    },
  ];

  const mockReport: AuditReport = {
    id: 'test-report-1',
    request: { id: 'test-report-1', sourceCode: 'pragma solidity ^0.8.0;', timestamp: Date.now() },
    consensus: {
      findings: [],
      totalAgents: 2,
      agreementRatio: 1,
      reportHash: '0xabc',
      storageRootHash: '',
      attestationTxHash: '',
      timestamp: Date.now(),
    },
    agents: mockAgents,
    duration: 5000,
    createdAt: Date.now(),
  };

  return {
    getAgents: vi.fn().mockReturnValue(mockAgents),
    getTopology: vi.fn().mockResolvedValue({
      reentrancy: { peerId: 'peer-reentrancy-9002', peers: ['peer-access-9003'] },
    }),
    runAudit: vi.fn().mockResolvedValue(mockReport),
    getAuditReport: vi.fn().mockImplementation((id: string) =>
      id === 'test-report-1' ? mockReport : null,
    ),
    getENSResolver: vi.fn().mockReturnValue({
      getVerificationProof: vi.fn().mockResolvedValue({ verified: true }),
    }),
  };
}

function createApp(manager: ReturnType<typeof createMockManager>) {
  const app = express();
  app.use(express.json());
  app.use('/api', createRoutes(manager as any));
  return app;
}

describe('API Routes', () => {
  let manager: ReturnType<typeof createMockManager>;
  let app: express.Express;

  beforeEach(() => {
    manager = createMockManager();
    app = createApp(manager);
  });

  describe('GET /api/agents', () => {
    it('returns list of agents', async () => {
      const res = await request(app).get('/api/agents');
      expect(res.status).toBe(200);
      expect(res.body.agents).toHaveLength(2);
      expect(res.body.agents[0].specialty).toBe('reentrancy');
      expect(res.body.agents[1].specialty).toBe('access-control');
    });

    it('returns 500 when manager throws', async () => {
      manager.getAgents.mockImplementation(() => { throw new Error('fail'); });
      const res = await request(app).get('/api/agents');
      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/topology', () => {
    it('returns mesh topology', async () => {
      const res = await request(app).get('/api/topology');
      expect(res.status).toBe(200);
      expect(res.body.topology).toBeDefined();
      expect(res.body.topology.reentrancy.peerId).toBe('peer-reentrancy-9002');
    });
  });

  describe('POST /api/audit', () => {
    it('starts audit with source code', async () => {
      const res = await request(app)
        .post('/api/audit')
        .send({ sourceCode: 'pragma solidity ^0.8.0; contract Foo { }' });
      expect(res.status).toBe(200);
      expect(res.body.auditId).toBeDefined();
      expect(res.body.status).toBe('started');
    });

    it('rejects when no input provided', async () => {
      const res = await request(app).post('/api/audit').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Provide contractAddress or sourceCode/);
    });

    it('rejects invalid contract address format', async () => {
      const res = await request(app)
        .post('/api/audit')
        .send({ contractAddress: 'not-an-address' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid contract address/);
    });

    it('rejects source code that is too short', async () => {
      const res = await request(app)
        .post('/api/audit')
        .send({ sourceCode: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/too short/);
    });

    it('accepts valid contract address format', async () => {
      // This will try to fetch from Etherscan - mock global fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          status: '1',
          result: [{ SourceCode: 'pragma solidity ^0.8.0; contract A {}' }],
        }),
      }) as any;

      const res = await request(app)
        .post('/api/audit')
        .send({ contractAddress: '0x' + 'a'.repeat(40) });
      expect(res.status).toBe(200);
      expect(res.body.auditId).toBeDefined();

      globalThis.fetch = originalFetch;
    });
  });

  describe('GET /api/audit/:id', () => {
    it('returns report for valid ID', async () => {
      const res = await request(app).get('/api/audit/test-report-1');
      expect(res.status).toBe(200);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.id).toBe('test-report-1');
    });

    it('returns 404 for unknown ID', async () => {
      const res = await request(app).get('/api/audit/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('GET /api/agents/tools', () => {
    it('returns MCP-compatible tool listing per agent', async () => {
      const res = await request(app).get('/api/agents/tools');
      expect(res.status).toBe(200);
      expect(res.body.agents).toHaveLength(2);
      expect(res.body.agents[0].tools[0].name).toBe('audit_reentrancy');
      expect(res.body.agents[0].tools[0].inputSchema).toBeDefined();
    });
  });

  describe('GET /api/agents/verify/:agentId', () => {
    it('returns verification proof for existing agent', async () => {
      const res = await request(app).get('/api/agents/verify/agent-1');
      expect(res.status).toBe(200);
      expect(res.body.proof).toBeDefined();
    });

    it('returns 404 for unknown agent', async () => {
      const res = await request(app).get('/api/agents/verify/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
