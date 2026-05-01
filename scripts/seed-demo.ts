// File: scripts/seed-demo.ts
// Creates demo state: ENS registrations, 0G Chain registrations, pre-seeded audit report

import 'dotenv/config';
import { ethers } from 'ethers';
import { ENSResolver } from '../packages/backend/src/ens/resolver';
import { ZGChainClient } from '../packages/backend/src/zg/chain';
import { ZGStorageClient } from '../packages/backend/src/zg/storage';
import {
  AGENT_SPECIALTIES,
  AGENT_ENS_NAMES,
} from '../packages/shared/src/constants';
import type { AuditReport, ConsensusResult } from '../packages/shared/src/types';

async function main() {
  const privateKey = process.env.PRIVATE_KEY!;
  const sepoliaRpc = process.env.SEPOLIA_RPC_URL!;

  console.log('=== Seeding Demo State ===');

  // 1. Register agents on ENS
  console.log('\n--- ENS Registration ---');
  const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpc);
  const sepoliaSigner = new ethers.Wallet(privateKey, sepoliaProvider);
  const ens = new ENSResolver(sepoliaProvider, sepoliaSigner);

  for (let i = 0; i < AGENT_SPECIALTIES.length; i++) {
    try {
      const txHashes = await ens.registerAgent(
        AGENT_ENS_NAMES[i],
        `demo-peer-id-${i}`.padEnd(64, '0'),
        AGENT_SPECIALTIES[i],
      );
      console.log(`  ${AGENT_ENS_NAMES[i]}: ${txHashes.length} tx(s)`);
    } catch (error) {
      console.warn(`  ${AGENT_ENS_NAMES[i]}: FAILED -`, error);
    }
  }

  // 2. Register agents on 0G Chain
  console.log('\n--- 0G Chain Registration ---');
  const chain = new ZGChainClient(privateKey);

  for (let i = 0; i < AGENT_SPECIALTIES.length; i++) {
    try {
      const txHash = await chain.registerAgent(
        AGENT_ENS_NAMES[i],
        AGENT_SPECIALTIES[i],
        `demo-peer-id-${i}`.padEnd(64, '0'),
      );
      console.log(`  ${AGENT_ENS_NAMES[i]}: ${txHash}`);
    } catch (error) {
      console.warn(`  ${AGENT_ENS_NAMES[i]}: FAILED -`, error);
    }
  }

  // 3. Upload pre-seeded audit report to 0G Storage
  console.log('\n--- Pre-seeded Audit Report ---');
  const storage = new ZGStorageClient(privateKey);

  const sampleReport: AuditReport = {
    id: 'demo-report-001',
    request: {
      id: 'demo-req-001',
      contractAddress: '0x0000000000000000000000000000000000000001',
      sourceCode: '// Sample vulnerable contract',
      timestamp: Date.now(),
    },
    consensus: {
      findings: [
        {
          finding: {
            id: 'f1',
            agentId: 'demo-agent-1',
            agentSpecialty: 'reentrancy',
            type: 'reentrancy',
            severity: 'CRITICAL',
            title: 'Classic Reentrancy in withdraw()',
            description: 'The withdraw function sends ETH before updating the balance, allowing recursive calls.',
            evidence: 'function withdraw() { msg.sender.call{value: balance}(""); balance = 0; }',
            lineNumbers: 'L42-L45',
            confidence: 0.95,
            timestamp: Date.now(),
          },
          votes: [],
          agreedCount: 3,
          finalSeverity: 'CRITICAL',
          consensusConfidence: 0.92,
        },
      ],
      totalAgents: 4,
      agreementRatio: 0.75,
      reportHash: '0x' + 'a'.repeat(64),
      storageRootHash: '',
      attestationTxHash: '',
      timestamp: Date.now(),
    },
    agents: [],
    duration: 45000,
    createdAt: Date.now(),
  };

  try {
    const { rootHash } = await storage.uploadReport(sampleReport);
    console.log(`  Report uploaded: rootHash=${rootHash}`);
  } catch (error) {
    console.warn('  Report upload FAILED:', error);
  }

  console.log('\n=== Demo State Seeded ===');
}

main().catch(console.error);
