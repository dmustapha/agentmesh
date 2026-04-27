// File: packages/backend/src/ens/resolver.ts

import { ethers } from 'ethers';
import {
  ENS_PUBLIC_RESOLVER,
  ENS_NAME_WRAPPER,
  ENS_PARENT_NAME,
  AGENT_REGISTRY_ADDRESS,
} from '@agentmesh/shared';
import type { AgentSpecialty, ENSAgentRecord } from '@agentmesh/shared';

const RESOLVER_ABI = [
  'function setText(bytes32 node, string key, string value) external',
  'function text(bytes32 node, string key) external view returns (string)',
];

const NAME_WRAPPER_ABI = [
  'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) external returns (bytes32)',
  'function ownerOf(uint256 id) external view returns (address)',
];

export class ENSResolver {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private resolver: ethers.Contract;
  private nameWrapper: ethers.Contract;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    this.resolver = new ethers.Contract(ENS_PUBLIC_RESOLVER, RESOLVER_ABI, signer);
    this.nameWrapper = new ethers.Contract(ENS_NAME_WRAPPER, NAME_WRAPPER_ABI, signer);
  }

  async registerAgent(
    ensName: string,
    peerId: string,
    specialty: AgentSpecialty,
  ): Promise<string[]> {
    const txHashes: string[] = [];
    const node = ethers.namehash(ensName);

    // If this is a subname, create it first
    if (ensName.split('.').length > 2) {
      try {
        const label = ensName.split('.')[0];
        const parentNode = ethers.namehash(ENS_PARENT_NAME);
        const ownerAddress = await this.signer.getAddress();

        const tx = await this.nameWrapper.setSubnodeRecord(
          parentNode,
          label,
          ownerAddress,
          ENS_PUBLIC_RESOLVER,
          0, // ttl
          0, // fuses
          Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year expiry
        );
        const receipt = await tx.wait();
        txHashes.push(receipt.hash);
        console.log(`[ENS] Created subname ${ensName}: ${receipt.hash}`);
      } catch (error) {
        console.warn(`[ENS] Subname creation failed for ${ensName}:`, error);
        // Continue with text record setting -- subname might already exist
      }
    }

    // Set ENSIP-25 agent-registration text record
    const registryAddr = AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';
    const agentId = specialty;
    const ensip25Key = `agent-registration[${registryAddr}][${agentId}]`;

    try {
      const tx1 = await this.resolver.setText(node, ensip25Key, '1');
      const receipt1 = await tx1.wait();
      txHashes.push(receipt1.hash);
      console.log(`[ENS] Set ENSIP-25 record for ${ensName}: ${receipt1.hash}`);
    } catch (error) {
      console.warn(`[ENS] ENSIP-25 text record failed for ${ensName}:`, error);
    }

    // Set additional capability text records
    const records: [string, string][] = [
      ['agentmesh.peerId', peerId],
      ['agentmesh.capability', specialty],
      ['agentmesh.model', 'qwen-2.5-7b-instruct'],
      ['agentmesh.version', '1.0.0'],
    ];

    for (const [key, value] of records) {
      try {
        const tx = await this.resolver.setText(node, key, value);
        const receipt = await tx.wait();
        txHashes.push(receipt.hash);
      } catch (error) {
        console.warn(`[ENS] Failed to set ${key} for ${ensName}:`, error);
      }
    }

    return txHashes;
  }

  async resolveAgent(ensName: string): Promise<ENSAgentRecord | null> {
    const node = ethers.namehash(ensName);

    try {
      const peerId = await this.resolver.text(node, 'agentmesh.peerId');
      const capability = await this.resolver.text(node, 'agentmesh.capability');
      const model = await this.resolver.text(node, 'agentmesh.model');
      const version = await this.resolver.text(node, 'agentmesh.version');

      if (!peerId) return null;

      return {
        name: ensName,
        peerId,
        specialty: capability as AgentSpecialty,
        capabilities: [capability],
        model: model || 'unknown',
        version: version || '1.0.0',
      };
    } catch {
      return null;
    }
  }

  async discoverAgents(): Promise<ENSAgentRecord[]> {
    const agents: ENSAgentRecord[] = [];
    const subnames = ['reentrancy', 'access', 'logic', 'economic'];

    for (const label of subnames) {
      const fullName = `${label}.${ENS_PARENT_NAME}`;
      const agent = await this.resolveAgent(fullName);
      if (agent) agents.push(agent);
    }

    return agents;
  }

  // [CRITIQUE E-2] ENSIP-26 agent verification
  async verifyAgent(ensName: string, signerKey: string): Promise<string> {
    const node = ethers.namehash(ensName);
    const nonce = ethers.hexlify(ethers.randomBytes(16));
    const timestamp = new Date().toISOString();

    // ENSIP-26 SIWA challenge: structured message proving agent controls its ENS name
    const challengeMessage = [
      `AgentMesh ENSIP-26 Verification`,
      `ENS Name: ${ensName}`,
      `Nonce: ${nonce}`,
      `Issued At: ${timestamp}`,
    ].join('\n');

    // Sign challenge with agent's key
    const agentWallet = new ethers.Wallet(signerKey);
    const signature = await agentWallet.signMessage(challengeMessage);

    // Store verification proof as text record ai.agent.verification
    const verificationRecord = JSON.stringify({ challenge: challengeMessage, signature, timestamp });
    try {
      const tx = await this.resolver.setText(node, 'ai.agent.verification', verificationRecord);
      const receipt = await tx.wait();
      console.log(`[ENS] ENSIP-26 verification stored for ${ensName}: ${receipt.hash}`);
    } catch (error) {
      console.warn(`[ENS] ENSIP-26 verification storage failed for ${ensName}:`, error);
    }

    return signature;
  }

  async getVerificationProof(ensName: string): Promise<{ challenge: string; signature: string; timestamp: string } | null> {
    const node = ethers.namehash(ensName);
    try {
      const raw = await this.resolver.text(node, 'ai.agent.verification');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
