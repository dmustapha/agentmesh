// Tests for ConsensusEngine
import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusEngine } from './consensus';
import type { Finding, Vote } from '@agentmesh/shared';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    agentId: 'agent-1',
    agentSpecialty: 'reentrancy',
    type: 'reentrancy',
    severity: 'HIGH',
    title: 'Reentrancy vulnerability',
    description: 'External call before state update',
    evidence: '.call{value:',
    confidence: 0.8,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    agentId: 'agent-2',
    findingId: 'finding-1',
    agree: true,
    severity: 'HIGH',
    confidence: 0.7,
    reasoning: 'Confirmed reentrancy pattern',
    ...overrides,
  };
}

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine();
  });

  it('aggregates findings with unanimous agreement', () => {
    const findings = [makeFinding()];
    const votes = [
      makeVote({ agentId: 'agent-2' }),
      makeVote({ agentId: 'agent-3' }),
      makeVote({ agentId: 'agent-4' }),
    ];

    const result = engine.aggregate(findings, votes, 4);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].finalSeverity).toBe('HIGH');
    expect(result.findings[0].agreedCount).toBe(4); // 3 votes + 1 original
    expect(result.reportHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.totalAgents).toBe(4);
  });

  it('excludes findings below agreement threshold', () => {
    const findings = [makeFinding({ confidence: 0.5, severity: 'LOW' })];
    // 3 agents disagree, only original agent agrees -> 1/4 = 0.25 < 0.5 threshold
    const votes = [
      makeVote({ agentId: 'agent-2', agree: false }),
      makeVote({ agentId: 'agent-3', agree: false }),
      makeVote({ agentId: 'agent-4', agree: false }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings).toHaveLength(0);
  });

  it('includes CRITICAL findings even with low agreement if high confidence', () => {
    const findings = [makeFinding({ severity: 'CRITICAL', confidence: 0.95 })];
    // No votes from other agents, but confidence >= 0.9 and CRITICAL
    const votes: Vote[] = [];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].finalSeverity).toBe('CRITICAL');
  });

  it('promotes severity when voters find higher severity', () => {
    const findings = [makeFinding({ severity: 'MEDIUM' })];
    const votes = [
      makeVote({ agentId: 'agent-2', agree: true, severity: 'CRITICAL' }),
      makeVote({ agentId: 'agent-3', agree: true, severity: 'HIGH' }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings).toHaveLength(1);
    // maxSeverity picks CRITICAL from the agree votes
    expect(result.findings[0].finalSeverity).toBe('CRITICAL');
  });

  it('sorts findings by severity then confidence', () => {
    const findings = [
      makeFinding({ id: 'f1', agentId: 'agent-a', severity: 'LOW', confidence: 0.9 }),
      makeFinding({ id: 'f2', agentId: 'agent-b', severity: 'CRITICAL', confidence: 0.95 }),
      makeFinding({ id: 'f3', agentId: 'agent-c', severity: 'HIGH', confidence: 0.8 }),
    ];
    // Each voter agrees with all findings from other agents
    const votes = [
      makeVote({ agentId: 'agent-x', findingId: 'f1', agree: true, severity: 'LOW' }),
      makeVote({ agentId: 'agent-x', findingId: 'f2', agree: true, severity: 'CRITICAL' }),
      makeVote({ agentId: 'agent-x', findingId: 'f3', agree: true, severity: 'HIGH' }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    // CRITICAL must come before HIGH which comes before LOW
    const ids = result.findings.map(f => f.finding.id);
    const critIdx = ids.indexOf('f2');
    const highIdx = ids.indexOf('f3');
    const lowIdx = ids.indexOf('f1');
    if (critIdx >= 0 && highIdx >= 0) expect(critIdx).toBeLessThan(highIdx);
    if (highIdx >= 0 && lowIdx >= 0) expect(highIdx).toBeLessThan(lowIdx);
  });

  it('handles empty findings and votes', () => {
    const result = engine.aggregate([], [], 4);
    expect(result.findings).toHaveLength(0);
    expect(result.agreementRatio).toBe(0);
    expect(result.totalAgents).toBe(4);
  });

  it('computes correct agreement ratio', () => {
    const findings = [
      makeFinding({ id: 'f1' }),
      makeFinding({ id: 'f2' }),
    ];
    const votes = [
      makeVote({ findingId: 'f1', agree: true }),
      makeVote({ findingId: 'f2', agree: true }),
    ];

    const result = engine.aggregate(findings, votes, 4);
    // Each finding: 2 agree (vote + original) out of 4 agents
    // Total agreed across findings / (num_findings * agentCount) = 4 / (2*4) = 0.5
    expect(result.agreementRatio).toBe(0.5);
  });

  it('generates a deterministic report hash', () => {
    const findings = [makeFinding()];
    const votes = [makeVote()];

    const result1 = engine.aggregate(findings, votes, 4);
    const result2 = engine.aggregate(findings, votes, 4);

    expect(result1.reportHash).toBe(result2.reportHash);
  });
});
