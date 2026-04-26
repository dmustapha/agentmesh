// File: packages/shared/src/types.ts

export type AgentSpecialty = 'reentrancy' | 'access-control' | 'logic' | 'economic';

export type AgentStatus = 'idle' | 'booting' | 'registered' | 'analyzing' | 'debating' | 'voting' | 'complete' | 'error';

export type VulnerabilityType =
  | 'reentrancy'
  | 'access-control'
  | 'integer-overflow'
  | 'unchecked-return'
  | 'front-running'
  | 'flash-loan'
  | 'oracle-manipulation'
  | 'logic-error'
  | 'dos'
  | 'other';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface AgentNode {
  id: string;
  peerId: string;
  ensName: string;
  specialty: AgentSpecialty;
  capabilities: string[];
  status: AgentStatus;
  axlPort: number;
}

export interface Finding {
  id: string;
  agentId: string;
  agentSpecialty: AgentSpecialty;
  type: VulnerabilityType | string;
  severity: Severity | string;
  title: string;
  description: string;
  evidence: string;
  lineNumbers?: string;
  confidence: number; // 0.0 - 1.0
  timestamp: number;
}

export interface Vote {
  agentId: string;
  findingId: string;
  agree: boolean;
  severity: Severity | string;
  confidence: number;
  reasoning: string;
}

export interface ConsensusResult {
  findings: ConsensusFinding[];
  totalAgents: number;
  agreementRatio: number;
  reportHash: string;
  storageRootHash: string;
  attestationTxHash: string;
  timestamp: number;
}

export interface ConsensusFinding {
  finding: Finding;
  votes: Vote[];
  agreedCount: number;
  finalSeverity: Severity;
  consensusConfidence: number;
}

export interface AuditRequest {
  id: string;
  contractAddress?: string;
  sourceCode?: string;
  chainId?: number;
  timestamp: number;
}

export interface AuditReport {
  id: string;
  request: AuditRequest;
  consensus: ConsensusResult;
  agents: AgentNode[];
  duration: number;
  createdAt: number;
}

export interface AXLMessage {
  type: 'contract' | 'finding' | 'vote' | 'consensus' | 'status';
  payload: unknown;
  fromAgent: string;
  toAgent: string;
  timestamp: number;
}

export interface TopologyData {
  ourIpv6: string;
  ourPublicKey: string;
  peers: string[];
  tree: unknown[];
}

// WebSocket event types
export type WSEventType =
  | 'agent:status'
  | 'agent:message'
  | 'audit:finding'
  | 'audit:vote'
  | 'audit:consensus'
  | 'audit:complete'
  | 'audit:error'
  | 'topology:update';

export interface WSEvent {
  type: WSEventType;
  data: unknown;
  timestamp: number;
}

// ENS types
export interface ENSAgentRecord {
  name: string;
  peerId: string;
  specialty: AgentSpecialty;
  capabilities: string[];
  model: string;
  version: string;
}

// 0G Chain types
export interface OnChainAgent {
  owner: string;
  name: string;
  capability: string;
  peerId: string;
  registeredAt: number;
}

export interface OnChainAttestation {
  id: string;
  contractAudited: string;
  findingsHash: string;
  storageRootHash: string;
  criticalCount: number;
  highCount: number;
  auditor: string;
  timestamp: number;
}
