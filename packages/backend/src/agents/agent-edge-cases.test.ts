// Debug Phase 5: AI Agent edge case tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditAgent } from './agent';
import { ConsensusEngine } from './consensus';
import type { Finding, Vote } from '@agentmesh/shared';

// Mock transport
function createMockTransport(peerId = 'mock-peer-1') {
  return {
    getPeerId: vi.fn().mockReturnValue(peerId),
    send: vi.fn().mockResolvedValue(undefined),
    recv: vi.fn().mockResolvedValue(null),
    close: vi.fn(),
  };
}

// Mock compute (LLM)
function createMockCompute() {
  return {
    chat: vi.fn().mockResolvedValue(JSON.stringify({ findings: [] })),
  };
}

describe('AI Agent Edge Cases', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let compute: ReturnType<typeof createMockCompute>;
  let agent: AuditAgent;

  beforeEach(() => {
    transport = createMockTransport();
    compute = createMockCompute();
    agent = new AuditAgent('reentrancy', 'test.agentmesh.eth', transport as any, compute as any, 9002);
  });

  // LLM timeout: agent falls back to static findings
  it('falls back to static findings when LLM times out', async () => {
    compute.chat.mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('LLM analysis timeout')), 50);
    }));

    const code = 'pragma solidity ^0.8.0; contract A { function w() external { msg.sender.call{value: 1}(""); } }';
    const findings = await agent.analyzeContract(code);

    // Static scan should still find the .call{value:} pattern
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe('reentrancy');
    expect(findings[0].evidence).toContain('.call{value:');
  });

  // LLM returns malformed JSON: agent gracefully degrades
  it('handles malformed LLM JSON response', async () => {
    compute.chat.mockResolvedValue('this is not json at all {{{');

    const code = 'pragma solidity ^0.8.0; contract A { function w() external { msg.sender.call{value: 1}(""); } }';
    const findings = await agent.analyzeContract(code);

    // Should still get static findings
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every(f => f.agentSpecialty === 'reentrancy')).toBe(true);
  });

  // LLM returns empty findings array
  it('handles LLM returning no findings', async () => {
    compute.chat.mockResolvedValue(JSON.stringify({ findings: [] }));

    const code = 'pragma solidity ^0.8.0; contract A { function w() external { msg.sender.call{value: 1}(""); } }';
    const findings = await agent.analyzeContract(code);

    // Static findings only
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every(f => f.lineNumbers === 'static-scan')).toBe(true);
  });

  // LLM throws unexpected error
  it('handles LLM throwing unexpected error', async () => {
    compute.chat.mockRejectedValue(new TypeError('Cannot read properties of undefined'));

    const code = 'pragma solidity ^0.8.0; contract Safe { uint256 x; }';
    const findings = await agent.analyzeContract(code);

    // No static patterns match this safe contract, so 0 findings
    expect(findings).toEqual([]);
  });

  // Empty source code
  it('handles empty source code without crashing', async () => {
    const findings = await agent.analyzeContract('');
    expect(Array.isArray(findings)).toBe(true);
  });

  // Extremely large source code (static scan performance)
  it('handles large source code', async () => {
    const largeCode = 'pragma solidity ^0.8.0; contract A {' + ' uint256 x;'.repeat(5000) + ' }';
    const findings = await agent.analyzeContract(largeCode);
    expect(Array.isArray(findings)).toBe(true);
  });

  // LLM returns markdown-wrapped JSON
  it('strips markdown code fences from LLM response', async () => {
    compute.chat.mockResolvedValue('```json\n{"findings":[{"type":"reentrancy","severity":"HIGH","title":"Test","description":"desc","evidence":"ev","confidence":0.8}]}\n```');

    const code = 'pragma solidity ^0.8.0; contract A { uint256 x; }';
    const findings = await agent.analyzeContract(code);

    const llmFindings = findings.filter(f => f.lineNumbers !== 'static-scan');
    expect(llmFindings.length).toBe(1);
    expect(llmFindings[0].severity).toBe('HIGH');
  });

  // LLM returns JSON with trailing commas (common LLM error)
  it('handles trailing commas in LLM JSON', async () => {
    compute.chat.mockResolvedValue('{"findings":[{"type":"test","severity":"LOW","title":"T","description":"d","evidence":"e","confidence":0.5,},]}');

    const code = 'pragma solidity ^0.8.0; contract A { uint256 x; }';
    const findings = await agent.analyzeContract(code);

    const llmFindings = findings.filter(f => f.lineNumbers !== 'static-scan');
    expect(llmFindings.length).toBe(1);
  });

  // Vote: LLM fails during evaluation => abstain
  it('abstains on vote when LLM fails', async () => {
    compute.chat.mockRejectedValue(new Error('Inference failed'));

    const finding: Finding = {
      id: 'f-1', agentId: 'a-1', agentSpecialty: 'reentrancy',
      type: 'reentrancy', severity: 'HIGH', title: 'Test',
      description: 'desc', evidence: 'ev', lineNumbers: '1',
      confidence: 0.8, timestamp: Date.now(),
    };

    const vote = await agent.evaluateFinding(finding);
    expect(vote.agree).toBe(false);
    expect(vote.confidence).toBe(0);
    expect(vote.reasoning).toContain('abstaining');
  });

  // Concurrent analyze calls
  it('handles concurrent analyze calls', async () => {
    compute.chat.mockResolvedValue(JSON.stringify({ findings: [] }));

    const code1 = 'pragma solidity ^0.8.0; contract A { function w() external { msg.sender.call{value: 1}(""); } }';
    const code2 = 'pragma solidity ^0.8.0; contract B { function x() external { tx.origin; } }';

    const [r1, r2] = await Promise.all([
      agent.analyzeContract(code1),
      agent.analyzeContract(code2),
    ]);

    expect(Array.isArray(r1)).toBe(true);
    expect(Array.isArray(r2)).toBe(true);
  });

  // Static scan suppression works
  it('suppresses false positives when suppressIf pattern matches', async () => {
    compute.chat.mockResolvedValue(JSON.stringify({ findings: [] }));

    const guardedCode = `pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
contract A is ReentrancyGuard {
  function w() external nonReentrant { msg.sender.call{value: 1}(""); }
}`;

    const findings = await agent.analyzeContract(guardedCode);
    const staticFindings = findings.filter(f => f.lineNumbers === 'static-scan');
    // ReentrancyGuard suppresses reentrancy findings
    expect(staticFindings.length).toBe(0);
  });

  // Status transitions
  it('emits status changes during analysis', async () => {
    const statuses: string[] = [];
    agent.onEvents({
      onStatusChange: (a) => statuses.push(a.status),
    });

    compute.chat.mockResolvedValue(JSON.stringify({ findings: [] }));
    await agent.analyzeContract('pragma solidity ^0.8.0; contract A { uint256 x; }');

    expect(statuses).toContain('analyzing');
  });

  // Finding events emitted
  it('emits finding events for each static finding', async () => {
    const foundFindings: Finding[] = [];
    agent.onEvents({
      onFinding: (f) => foundFindings.push(f),
    });

    compute.chat.mockResolvedValue(JSON.stringify({ findings: [] }));
    const code = 'pragma solidity ^0.8.0; contract A { function w() external { msg.sender.call{value: 1}(""); } }';
    await agent.analyzeContract(code);

    expect(foundFindings.length).toBeGreaterThan(0);
  });
});

describe('Consensus Engine Edge Cases', () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine();
  });

  // No findings at all
  it('handles empty findings', () => {
    const result = engine.aggregate([], []);
    expect(result.findings).toHaveLength(0);
    expect(result.agreementRatio).toBe(0);
    expect(result.reportHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  // Finding with no votes (only originator agrees implicitly)
  it('handles finding with no votes', () => {
    const finding: Finding = {
      id: 'f-1', agentId: 'a-1', agentSpecialty: 'reentrancy',
      type: 'reentrancy', severity: 'HIGH', title: 'Test',
      description: 'desc', evidence: 'ev', lineNumbers: '1',
      confidence: 0.8, timestamp: Date.now(),
    };

    const result = engine.aggregate([finding], [], 4);
    // 1 agree out of 1 voter = 100% agreement, threshold met
    expect(result.findings.length).toBe(1);
  });

  // All agents disagree
  it('excludes finding when all agents disagree', () => {
    const finding: Finding = {
      id: 'f-1', agentId: 'a-1', agentSpecialty: 'reentrancy',
      type: 'reentrancy', severity: 'LOW', title: 'Test',
      description: 'desc', evidence: 'ev', lineNumbers: '1',
      confidence: 0.3, timestamp: Date.now(),
    };

    const votes: Vote[] = [
      { agentId: 'a-2', findingId: 'f-1', agree: false, severity: 'LOW', confidence: 0.1, reasoning: 'no' },
      { agentId: 'a-3', findingId: 'f-1', agree: false, severity: 'LOW', confidence: 0.1, reasoning: 'no' },
      { agentId: 'a-4', findingId: 'f-1', agree: false, severity: 'LOW', confidence: 0.1, reasoning: 'no' },
    ];

    const result = engine.aggregate([finding], votes, 4);
    // 1 agree (originator) out of 4 = 25% < threshold
    expect(result.findings.length).toBe(0);
  });

  // Severity promotion: votes can upgrade severity
  it('promotes severity based on max vote severity', () => {
    const finding: Finding = {
      id: 'f-1', agentId: 'a-1', agentSpecialty: 'reentrancy',
      type: 'reentrancy', severity: 'MEDIUM', title: 'Test',
      description: 'desc', evidence: 'ev', lineNumbers: '1',
      confidence: 0.8, timestamp: Date.now(),
    };

    const votes: Vote[] = [
      { agentId: 'a-2', findingId: 'f-1', agree: true, severity: 'CRITICAL', confidence: 0.9, reasoning: 'yes' },
      { agentId: 'a-3', findingId: 'f-1', agree: true, severity: 'HIGH', confidence: 0.8, reasoning: 'yes' },
    ];

    const result = engine.aggregate([finding], votes, 4);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].finalSeverity).toBe('CRITICAL');
  });

  // Critical finding with high confidence bypasses agreement threshold
  it('includes critical high-confidence finding even with low agreement', () => {
    const finding: Finding = {
      id: 'f-1', agentId: 'a-1', agentSpecialty: 'reentrancy',
      type: 'reentrancy', severity: 'CRITICAL', title: 'Critical',
      description: 'desc', evidence: 'ev', lineNumbers: '1',
      confidence: 0.95, timestamp: Date.now(),
    };

    const votes: Vote[] = [
      { agentId: 'a-2', findingId: 'f-1', agree: false, severity: 'LOW', confidence: 0.1, reasoning: 'no' },
      { agentId: 'a-3', findingId: 'f-1', agree: false, severity: 'LOW', confidence: 0.1, reasoning: 'no' },
      { agentId: 'a-4', findingId: 'f-1', agree: false, severity: 'LOW', confidence: 0.1, reasoning: 'no' },
    ];

    const result = engine.aggregate([finding], votes, 4);
    // Critical + confidence >= 0.9 bypasses agreement threshold
    expect(result.findings.length).toBe(1);
  });

  // Sorting: CRITICAL before HIGH before MEDIUM
  it('sorts findings by severity then confidence', () => {
    const findings: Finding[] = [
      { id: 'f-1', agentId: 'a-1', agentSpecialty: 'reentrancy', type: 'r', severity: 'MEDIUM', title: 'M', description: 'd', evidence: 'e', lineNumbers: '1', confidence: 0.9, timestamp: 1 },
      { id: 'f-2', agentId: 'a-1', agentSpecialty: 'reentrancy', type: 'r', severity: 'CRITICAL', title: 'C', description: 'd', evidence: 'e', lineNumbers: '1', confidence: 0.95, timestamp: 2 },
      { id: 'f-3', agentId: 'a-1', agentSpecialty: 'reentrancy', type: 'r', severity: 'HIGH', title: 'H', description: 'd', evidence: 'e', lineNumbers: '1', confidence: 0.8, timestamp: 3 },
    ];

    const result = engine.aggregate(findings, [], 4);
    expect(result.findings[0].finalSeverity).toBe('CRITICAL');
    expect(result.findings[1].finalSeverity).toBe('HIGH');
    expect(result.findings[2].finalSeverity).toBe('MEDIUM');
  });

  // Report hash determinism
  it('produces consistent report hashes for same input', () => {
    const finding: Finding = {
      id: 'f-1', agentId: 'a-1', agentSpecialty: 'reentrancy',
      type: 'reentrancy', severity: 'HIGH', title: 'Test',
      description: 'desc', evidence: 'ev', lineNumbers: '1',
      confidence: 0.8, timestamp: 1000,
    };

    const r1 = engine.aggregate([finding], [], 4);
    const r2 = engine.aggregate([finding], [], 4);
    expect(r1.reportHash).toBe(r2.reportHash);
  });
});
