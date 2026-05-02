// File: packages/backend/src/zg/chain.ts

import { ethers } from 'ethers';
import {
  ZG_CHAIN_RPC,
  AGENT_REGISTRY_ADDRESS,
  AUDIT_ATTESTATION_ADDRESS,
} from '@agentmesh/shared';

const AGENT_REGISTRY_ABI = [
  'function registerAgent(string name, string capability, bytes32 peerId) external',
  'function getAgent(bytes32 peerId) external view returns (tuple(address owner, string name, string capability, bytes32 peerId, uint256 registeredAt, bool active))',
  'function getAgent(address owner) external view returns (tuple(address owner, string name, string capability, bytes32 peerId, uint256 registeredAt, bool active))',
  'function getAllAgents() external view returns (tuple(address owner, string name, string capability, bytes32 peerId, uint256 registeredAt, bool active)[])',
  'function getAgentCount() external view returns (uint256)',
];

const AUDIT_ATTESTATION_ABI = [
  'function attest(address contractAudited, bytes32 findingsHash, bytes32 storageRootHash, uint8 criticalCount, uint8 highCount) external returns (bytes32)',
  'function getAttestation(bytes32 id) external view returns (tuple(bytes32 id, address contractAudited, bytes32 findingsHash, bytes32 storageRootHash, uint8 criticalCount, uint8 highCount, address auditor, uint256 timestamp))',
  'function getAttestationCount() external view returns (uint256)',
  'function getLatestAttestations(uint256 count) external view returns (tuple(bytes32 id, address contractAudited, bytes32 findingsHash, bytes32 storageRootHash, uint8 criticalCount, uint8 highCount, address auditor, uint256 timestamp)[])',
];

export class ZGChainClient {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private registry: ethers.Contract;
  private attestation: ethers.Contract;

  constructor(privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(ZG_CHAIN_RPC);
    this.signer = new ethers.Wallet(privateKey, this.provider);

    const registryAddr = process.env.AGENT_REGISTRY_ADDRESS || AGENT_REGISTRY_ADDRESS || ethers.ZeroAddress;
    const attestationAddr = process.env.AUDIT_ATTESTATION_ADDRESS || AUDIT_ATTESTATION_ADDRESS || ethers.ZeroAddress;

    this.registry = new ethers.Contract(
      registryAddr,
      AGENT_REGISTRY_ABI,
      this.signer,
    );
    this.attestation = new ethers.Contract(
      attestationAddr,
      AUDIT_ATTESTATION_ABI,
      this.signer,
    );
  }

  private async sendTx(
    contract: ethers.Contract,
    method: string,
    args: unknown[],
    label: string,
    retries = 1,
  ): Promise<string> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const gasEstimate = await contract[method].estimateGas(...args);
        const gasLimit = (gasEstimate * 120n) / 100n; // 20% buffer
        const nonce = await this.signer.getNonce();
        const tx = await contract[method](...args, { nonce, gasLimit });
        const receipt = await tx.wait();
        console.log(`[0G Chain] ${label}: ${receipt.hash}`);
        return receipt.hash;
      } catch (error) {
        const msg = (error as Error).message;
        if (attempt < retries && (msg.includes('nonce') || msg.includes('timeout') || msg.includes('NETWORK_ERROR'))) {
          console.warn(`[0G Chain] ${label} attempt ${attempt + 1} failed, retrying:`, msg);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        throw error;
      }
    }
    throw new Error(`${label} failed after retries`);
  }

  async registerAgent(name: string, capability: string, peerId: string): Promise<string> {
    // Convert peerId to bytes32 — 64-char hex string (ed25519 pubkey) maps directly
    let peerIdBytes: string;
    const hexPeerId = peerId.startsWith('0x') ? peerId : `0x${peerId}`;
    if (/^0x[a-fA-F0-9]{64}$/.test(hexPeerId)) {
      peerIdBytes = hexPeerId;
    } else {
      // Fallback: hash non-standard peer IDs (e.g., simulated)
      peerIdBytes = ethers.id(peerId);
    }
    return this.sendTx(this.registry, 'registerAgent', [name, capability, peerIdBytes], `Register agent ${name}`);
  }

  async attest(
    contractAddress: string,
    findingsHash: string,
    storageRootHash: string,
    criticalCount: number,
    highCount: number,
  ): Promise<string> {
    const findingsBytes = ethers.id(findingsHash);
    const storageBytes = storageRootHash.startsWith('0x')
      ? ethers.zeroPadValue(storageRootHash, 32)
      : ethers.id(storageRootHash);

    return this.sendTx(
      this.attestation,
      'attest',
      [contractAddress, findingsBytes, storageBytes, criticalCount, highCount],
      'Attestation',
    );
  }

  async getAgentCount(): Promise<number> {
    return Number(await this.registry.getAgentCount());
  }

  async getAttestationCount(): Promise<number> {
    return Number(await this.attestation.getAttestationCount());
  }

  async getLatestAttestations(count: number = 5): Promise<unknown[]> {
    return this.attestation.getLatestAttestations(count);
  }
}
