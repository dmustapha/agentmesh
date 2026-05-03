// File: packages/backend/src/agents/manager.ts

import {
  AgentNode,
  AgentSpecialty,
  AuditRequest,
  AuditReport,
  Finding,
  Vote,
  AXLMessage,
  AGENT_SPECIALTIES,
  AGENT_ENS_NAMES,
  AXL_PORTS,
  MAX_AUDIT_DURATION_MS,
} from '@agentmesh/shared';
import { AXLMesh, MeshNode } from '../axl/mesh';
import { AXLTransport } from '../axl/transport';
import { AuditAgent } from './agent';
import { ConsensusEngine } from './consensus';
import { ZGComputeClient } from '../zg/compute';
import { ZGStorageClient } from '../zg/storage';
import { ZGChainClient } from '../zg/chain';
import { ENSResolver } from '../ens/resolver';
import { WebSocketBroadcaster } from '../api/websocket';
import { randomUUID } from 'crypto';

export class AgentManager {
  private mesh: AXLMesh;
  private agents: Map<AgentSpecialty, AuditAgent> = new Map();
  private compute: ZGComputeClient;
  private storage: ZGStorageClient;
  private chain: ZGChainClient;
  private ens: ENSResolver;
  private consensus: ConsensusEngine;
  private broadcaster?: WebSocketBroadcaster;
  private completedReports: Map<string, AuditReport> = new Map();
  private demoMode: boolean;

  constructor(
    mesh: AXLMesh,
    compute: ZGComputeClient,
    storage: ZGStorageClient,
    chain: ZGChainClient,
    ens: ENSResolver,
    demoMode: boolean = false,
  ) {
    this.mesh = mesh;
    this.compute = compute;
    this.storage = storage;
    this.chain = chain;
    this.ens = ens;
    this.consensus = new ConsensusEngine();
    this.demoMode = demoMode;
  }

  setBroadcaster(broadcaster: WebSocketBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  getENSResolver(): ENSResolver {
    return this.ens;
  }

  async initialize(): Promise<AgentNode[]> {
    const meshNodes = await this.mesh.start();
    const agentNodes: AgentNode[] = [];

    for (let i = 0; i < meshNodes.length; i++) {
      const meshNode = meshNodes[i];
      const transport = new AXLTransport(meshNode.client, meshNode.peerId);
      const agent = new AuditAgent(
        meshNode.specialty,
        AGENT_ENS_NAMES[i],
        transport,
        this.compute,
        meshNode.port,
      );

      agent.onEvents({
        onStatusChange: (node) => {
          this.broadcaster?.broadcast({ type: 'agent:status', data: node, timestamp: Date.now() });
        },
        onFinding: (finding) => {
          this.broadcaster?.broadcast({ type: 'audit:finding', data: finding, timestamp: Date.now() });
        },
        onMessage: (msg) => {
          this.broadcaster?.broadcast({ type: 'agent:message', data: msg, timestamp: Date.now() });
        },
      });

      this.agents.set(meshNode.specialty, agent);
      agentNodes.push(agent.node);
    }

    // Register agents on ENS and 0G Chain (skip in demo mode -- no funded keys)
    if (!this.demoMode) {
      try {
        await Promise.race([
          this.registerAgentsOnChain(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('On-chain registration timeout (60s)')), 60000)),
        ]);
      } catch (error) {
        console.warn('[Manager] On-chain registration failed (non-fatal):', (error as Error).message);
      }

      try {
        await Promise.race([
          this.registerAgentsOnENS(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('ENS registration timeout (30s)')), 30000)),
        ]);
      } catch (error) {
        console.warn('[Manager] ENS registration failed (non-fatal):', (error as Error).message);
      }
    } else {
      console.log('[Manager] Demo mode -- skipping on-chain and ENS registration');
    }

    return agentNodes;
  }

  private async registerAgentsOnChain(): Promise<void> {
    for (const [specialty, agent] of this.agents) {
      await this.chain.registerAgent(agent.node.ensName, specialty, agent.node.peerId);
    }
  }

  private async registerAgentsOnENS(): Promise<void> {
    for (const [, agent] of this.agents) {
      await this.ens.registerAgent(agent.node.ensName, agent.node.peerId, agent.node.specialty);
    }
  }

  async runAudit(request: AuditRequest): Promise<AuditReport> {
    const startTime = Date.now();
    const allAgents = Array.from(this.agents.values());
    const peerIds = allAgents.map((a) => a.node.peerId);

    // Phase 1: All agents analyze the contract in parallel
    const sourceCode = request.sourceCode || '';
    const analysisPromises = allAgents.map((agent) => agent.analyzeContract(sourceCode));

    const timeoutPromise = new Promise<Finding[][]>((_, reject) =>
      setTimeout(() => reject(new Error('Audit timeout')), MAX_AUDIT_DURATION_MS),
    );

    let allFindings: Finding[][];
    try {
      allFindings = await Promise.race([Promise.all(analysisPromises), timeoutPromise]);
    } catch {
      allFindings = await Promise.all(
        analysisPromises.map((p) => p.catch(() => [] as Finding[])),
      );
    }

    const flatFindings = allFindings.flat();

    // Phase 2: Agents share findings via AXL mesh
    for (const agent of allAgents) {
      const agentFindings = flatFindings.filter((f) => f.agentId === agent.node.id);
      await agent.shareFindings(agentFindings, peerIds);
    }

    // Give agents time to receive messages
    await new Promise((r) => setTimeout(r, 1000));

    // Phase 3: Agents vote on each other's findings
    // Each agent votes sequentially on findings (avoids overwhelming 0G Compute),
    // but all agents run in parallel (max 4 concurrent LLM calls).
    const allVotes: Vote[] = [];
    const agentVotePromises = allAgents.map(async (agent) => {
      const otherFindings = flatFindings.filter((f) => f.agentId !== agent.node.id);
      const votes: { vote: Vote; specialty: AgentSpecialty }[] = [];
      for (const finding of otherFindings) {
        try {
          const vote = await agent.evaluateFinding(finding);
          votes.push({ vote, specialty: agent.node.specialty });
        } catch {
          // Individual vote failure is non-fatal
        }
      }
      return votes;
    });
    const agentVoteResults = await Promise.allSettled(agentVotePromises);
    for (const result of agentVoteResults) {
      if (result.status === 'fulfilled') {
        for (const { vote, specialty } of result.value) {
          allVotes.push(vote);
          this.broadcaster?.broadcast({
            type: 'audit:vote',
            data: { vote, agentSpecialty: specialty },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Phase 4: Consensus
    const consensusResult = this.consensus.aggregate(flatFindings, allVotes, allAgents.length);

    // Phase 5: Store report on 0G Storage
    const report: AuditReport = {
      id: request.id,
      request,
      consensus: consensusResult,
      agents: allAgents.map((a) => a.node),
      duration: Date.now() - startTime,
      createdAt: Date.now(),
    };

    try {
      const storageTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timeout (15s)')), 15_000),
      );
      const { rootHash } = await Promise.race([this.storage.uploadReport(report), storageTimeout]);
      report.consensus.storageRootHash = rootHash;
    } catch (error) {
      console.warn('[Manager] 0G Storage upload failed:', (error as Error).message);
      report.consensus.storageRootHash = 'STORAGE_UNAVAILABLE';
    }

    // Phase 6: Attest on 0G Chain
    try {
      const criticals = consensusResult.findings.filter((f) => f.finalSeverity === 'CRITICAL').length;
      const highs = consensusResult.findings.filter((f) => f.finalSeverity === 'HIGH').length;
      // Use the audited contract address, or the AgentRegistry address as a meaningful fallback
      const attestAddress = request.contractAddress || process.env.AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000001';
      const attestTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Chain attestation timeout (20s)')), 20_000),
      );
      const txHash = await Promise.race([
        this.chain.attest(
          attestAddress,
          report.consensus.reportHash,
          report.consensus.storageRootHash,
          criticals,
          highs,
        ),
        attestTimeout,
      ]);
      report.consensus.attestationTxHash = txHash;
    } catch (error) {
      console.warn('[Manager] 0G Chain attestation failed:', (error as Error).message);
      report.consensus.attestationTxHash = 'ATTESTATION_UNAVAILABLE';
    }

    this.broadcaster?.broadcast({ type: 'audit:complete', data: report, timestamp: Date.now() });

    // Set all agents back to idle
    for (const agent of allAgents) {
      agent.node.status = 'idle';
      this.broadcaster?.broadcast({ type: 'agent:status', data: agent.node, timestamp: Date.now() });
    }

    // In-memory cache only — reports are lost on restart.
    // Persistent copies live on 0G Storage (rootHash above).
    this.completedReports.set(report.id, report);
    if (this.completedReports.size > 50) {
      const oldest = this.completedReports.keys().next().value;
      if (oldest) this.completedReports.delete(oldest);
    }

    return report;
  }

  getAgents(): AgentNode[] {
    return Array.from(this.agents.values()).map((a) => a.node);
  }

  getAuditReport(id: string): AuditReport | null {
    return this.completedReports.get(id) ?? null;
  }

  async getTopology(): Promise<Record<string, { peerId: string; peers: string[] }>> {
    const topo = await this.mesh.getTopology();
    const result: Record<string, { peerId: string; peers: string[] }> = {};
    for (const [specialty, data] of topo) {
      result[specialty] = data;
    }
    return result;
  }

  async shutdown(): Promise<void> {
    await this.mesh.stop();
    this.agents.clear();
  }
}
