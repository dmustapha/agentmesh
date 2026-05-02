// Debug Phase 5: API edge case tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRoutes } from './routes';

function createMockManager() {
  return {
    getAgents: vi.fn().mockReturnValue([
      { id: 'a-1', peerId: 'p-1', ensName: 'r.agentmesh.eth', specialty: 'reentrancy', capabilities: ['reentrancy'], status: 'idle', axlPort: 9002 },
    ]),
    getTopology: vi.fn().mockResolvedValue({}),
    runAudit: vi.fn().mockResolvedValue({}),
    getAuditReport: vi.fn().mockReturnValue(null),
    getENSResolver: vi.fn().mockReturnValue({
      getVerificationProof: vi.fn().mockResolvedValue({ verified: false }),
    }),
  };
}

describe('API Edge Cases', () => {
  let app: express.Express;
  let manager: ReturnType<typeof createMockManager>;

  beforeEach(() => {
    manager = createMockManager();
    app = express();
    app.use(express.json({ limit: '5mb' }));
    app.use('/api', createRoutes(manager as any));
  });

  // Malformed JSON body
  it('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/audit')
      .set('Content-Type', 'application/json')
      .send('{"bad json');
    expect(res.status).toBe(400);
  });

  // Missing required fields
  it('rejects audit with empty object', async () => {
    const res = await request(app).post('/api/audit').send({});
    expect(res.status).toBe(400);
  });

  // Wrong HTTP method
  it('rejects GET on audit endpoint', async () => {
    const res = await request(app).get('/api/audit');
    // Express will 404 since only POST is defined for /api/audit
    expect(res.status).toBe(404);
  });

  // Extra unexpected fields (should be ignored)
  it('ignores extra fields in audit request', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ sourceCode: 'pragma solidity ^0.8.0; contract A { uint x; }', extraField: 'ignored', nested: { deep: true } });
    expect(res.status).toBe(200);
    expect(res.body.auditId).toBeDefined();
  });

  // Very large body (within 5mb limit)
  it('accepts large source code', async () => {
    const largeCode = 'pragma solidity ^0.8.0; contract A {' + ' uint256 x;'.repeat(1000) + ' }';
    const res = await request(app)
      .post('/api/audit')
      .send({ sourceCode: largeCode });
    expect(res.status).toBe(200);
  });

  // SQL injection strings in text fields
  it('handles SQL injection strings without error', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ sourceCode: "'; DROP TABLE users; -- pragma solidity ^0.8.0; contract X { uint y; }" });
    // Should either accept (it's just text) or reject on validation, not crash
    expect([200, 400]).toContain(res.status);
    if (res.body.error) {
      expect(res.body.error).not.toMatch(/SQL|syntax|DROP/i);
    }
  });

  // XSS payloads in text fields
  it('handles XSS payloads without error', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ sourceCode: '<script>alert(1)</script> pragma solidity ^0.8.0; contract X { uint y; }' });
    expect([200, 400]).toContain(res.status);
  });

  // Non-existent report ID
  it('returns 404 for nonexistent report', async () => {
    const res = await request(app).get('/api/audit/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // Verify unknown agent
  it('returns 404 for unknown agent verification', async () => {
    const res = await request(app).get('/api/agents/verify/nonexistent-agent');
    expect(res.status).toBe(404);
  });

  // Manager throws on topology
  it('returns 500 when topology throws', async () => {
    manager.getTopology.mockRejectedValue(new Error('Mesh down'));
    const res = await request(app).get('/api/topology');
    expect(res.status).toBe(500);
  });

  // Concurrent audit submissions
  it('handles concurrent audit requests', async () => {
    const promises = Array.from({ length: 3 }, (_, i) =>
      request(app)
        .post('/api/audit')
        .send({ sourceCode: `pragma solidity ^0.8.0; contract C${i} { uint x; }` })
    );
    const results = await Promise.all(promises);
    // All should succeed (within rate limit)
    results.forEach(r => expect(r.status).toBe(200));
    // All should have unique audit IDs
    const ids = results.map(r => r.body.auditId);
    expect(new Set(ids).size).toBe(3);
  });
});
