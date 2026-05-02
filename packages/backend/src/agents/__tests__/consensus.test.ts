import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../consensus';
import type { Finding, Vote, Severity } from '@agentmesh/shared';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    agentId: 'agent-1',
    agentSpecialty: 'reentrancy',
    type: 'reentrancy',
    severity: 'HIGH',
    title: 'Reentrancy in withdraw',
    description: 'State updated after external call',
    evidence: 'line 42',
    confidence: 0.9,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    agentId: 'agent-2',
    findingId: 'f1',
    agree: true,
    severity: 'HIGH',
    confidence: 0.8,
    reasoning: 'Confirmed pattern',
    ...overrides,
  };
}

describe('ConsensusEngine', () => {
  const engine = new ConsensusEngine();

  it('includes findings that meet agreement threshold', () => {
    const findings = [makeFinding()];
    const votes = [
      makeVote({ agentId: 'agent-2', agree: true }),
      makeVote({ agentId: 'agent-3', agree: true }),
      makeVote({ agentId: 'agent-4', agree: true }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].agreedCount).toBe(4); // 3 votes + 1 implicit
  });

  it('excludes findings below agreement threshold', () => {
    const findings = [makeFinding()];
    const votes = [
      makeVote({ agentId: 'agent-2', agree: false }),
      makeVote({ agentId: 'agent-3', agree: false }),
      makeVote({ agentId: 'agent-4', agree: false }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    // 1 agree (implicit) / 4 total = 0.25 < 0.5 threshold
    expect(result.findings).toHaveLength(0);
  });

  it('includes high-confidence CRITICAL even without consensus', () => {
    const findings = [makeFinding({ severity: 'CRITICAL', confidence: 0.95 })];
    const votes = [
      makeVote({ agentId: 'agent-2', agree: false }),
      makeVote({ agentId: 'agent-3', agree: false }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings).toHaveLength(1);
  });

  it('escalates severity to max across all votes', () => {
    const findings = [makeFinding({ severity: 'MEDIUM' })];
    const votes = [
      makeVote({ agentId: 'agent-2', agree: true, severity: 'CRITICAL' }),
      makeVote({ agentId: 'agent-3', agree: true, severity: 'HIGH' }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings[0].finalSeverity).toBe('CRITICAL');
  });

  it('includes severity from disagreeing votes too', () => {
    const findings = [makeFinding({ severity: 'LOW' })];
    const votes = [
      makeVote({ agentId: 'agent-2', agree: true, severity: 'LOW' }),
      makeVote({ agentId: 'agent-3', agree: true, severity: 'LOW' }),
      makeVote({ agentId: 'agent-4', agree: false, severity: 'CRITICAL' }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings).toHaveLength(1);
    // Even though agent-4 disagreed, their CRITICAL severity should be considered
    expect(result.findings[0].finalSeverity).toBe('CRITICAL');
  });

  it('sorts findings by severity then confidence', () => {
    const findings = [
      makeFinding({ id: 'f1', severity: 'LOW', confidence: 0.9 }),
      makeFinding({ id: 'f2', severity: 'CRITICAL', confidence: 0.7 }),
      makeFinding({ id: 'f3', severity: 'HIGH', confidence: 0.95 }),
    ];
    const votes = [
      makeVote({ findingId: 'f1', agree: true }),
      makeVote({ findingId: 'f2', agree: true }),
      makeVote({ findingId: 'f3', agree: true }),
    ];

    const result = engine.aggregate(findings, votes, 2);
    expect(result.findings[0].finding.id).toBe('f2'); // CRITICAL first
    expect(result.findings[1].finding.id).toBe('f3'); // HIGH second
    expect(result.findings[2].finding.id).toBe('f1'); // LOW last
  });

  it('produces a deterministic report hash', () => {
    const findings = [makeFinding()];
    const votes = [makeVote()];

    const r1 = engine.aggregate(findings, votes, 4);
    const r2 = engine.aggregate(findings, votes, 4);
    expect(r1.reportHash).toBe(r2.reportHash);
    expect(r1.reportHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('handles empty findings', () => {
    const result = engine.aggregate([], [], 4);
    expect(result.findings).toHaveLength(0);
    expect(result.agreementRatio).toBe(0);
    expect(result.totalAgents).toBe(4);
  });

  it('computes correct agreementRatio', () => {
    const findings = [makeFinding()];
    const votes = [
      makeVote({ agentId: 'agent-2', agree: true }),
      makeVote({ agentId: 'agent-3', agree: true }),
      makeVote({ agentId: 'agent-4', agree: false }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    // 3 agreed (2 explicit + 1 implicit) out of 4 agents, for 1 finding
    expect(result.agreementRatio).toBe(3 / 4);
  });
});
