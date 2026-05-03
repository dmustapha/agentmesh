// File: packages/backend/src/agents/consensus.ts

import {
  Finding,
  Vote,
  ConsensusResult,
  ConsensusFinding,
  Severity,
  CONSENSUS_AGREEMENT_THRESHOLD,
  CONSENSUS_CRITICAL_CONFIDENCE,
} from '@agentmesh/shared';
import { createHash } from 'crypto';

export class ConsensusEngine {
  aggregate(findings: Finding[], votes: Vote[], agentCount?: number): ConsensusResult {
    const findingMap = new Map<string, Finding>();
    for (const f of findings) {
      findingMap.set(f.id, f);
    }

    const votesByFinding = new Map<string, Vote[]>();
    for (const v of votes) {
      const existing = votesByFinding.get(v.findingId) || [];
      existing.push(v);
      votesByFinding.set(v.findingId, existing);
    }

    const consensusFindings: ConsensusFinding[] = [];

    for (const [findingId, finding] of findingMap) {
      const findingVotes = votesByFinding.get(findingId) || [];
      // Separate real votes from abstentions (confidence: 0 = inference failed)
      const realVotes = findingVotes.filter((v) => v.confidence > 0);
      const abstainCount = findingVotes.length - realVotes.length;

      // Include the original agent's implicit "agree" vote
      const totalVoters = realVotes.length + 1;
      const agreeCount = realVotes.filter((v) => v.agree).length + 1;
      const agreementRatio = agreeCount / totalVoters;

      // Include if: agreement threshold met, high-confidence critical, OR all other agents abstained
      const allAbstained = abstainCount === findingVotes.length && findingVotes.length > 0;
      const includeFinding =
        agreementRatio >= CONSENSUS_AGREEMENT_THRESHOLD ||
        (finding.confidence >= CONSENSUS_CRITICAL_CONFIDENCE && finding.severity === 'CRITICAL') ||
        allAbstained;

      if (includeFinding) {
        // Include severity from ALL votes (not just agreeing) to catch critical assessments
        const severities = [
          finding.severity,
          ...findingVotes.map((v) => v.severity),
        ];
        const finalSeverity = this.maxSeverity(severities as Severity[]);

        const avgConfidence = allAbstained
          ? finding.confidence
          : realVotes.reduce((sum, v) => sum + (v.agree ? v.confidence : 0), finding.confidence) /
            agreeCount;

        consensusFindings.push({
          finding,
          votes: findingVotes,
          agreedCount: agreeCount,
          finalSeverity,
          consensusConfidence: avgConfidence,
        });
      }
    }

    // Sort by severity then confidence
    consensusFindings.sort((a, b) => {
      const sevOrder: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
      const sevDiff = sevOrder[a.finalSeverity] - sevOrder[b.finalSeverity];
      if (sevDiff !== 0) return sevDiff;
      return b.consensusConfidence - a.consensusConfidence;
    });

    const reportContent = JSON.stringify(consensusFindings);
    const reportHash = createHash('sha256').update(reportContent).digest('hex');

    return {
      findings: consensusFindings,
      totalAgents: agentCount ?? (new Set(findings.map(f => f.agentId)).size || 4),
      agreementRatio:
        consensusFindings.length > 0
          ? consensusFindings.reduce((sum, f) => sum + f.agreedCount, 0) /
            (consensusFindings.length * (agentCount ?? (new Set(findings.map(f => f.agentId)).size || 4)))
          : 0,
      reportHash: `0x${reportHash}`,
      storageRootHash: '',
      attestationTxHash: '',
      timestamp: Date.now(),
    };
  }

  private maxSeverity(severities: Severity[]): Severity {
    const order: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    for (const sev of order) {
      if (severities.includes(sev)) return sev;
    }
    return 'INFO';
  }
}
