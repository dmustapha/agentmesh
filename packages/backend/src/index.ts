// File: packages/backend/src/index.ts

import path from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
// Load from monorepo root — .env lives there, not in packages/backend/
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { AXLMesh } from './axl/mesh';
import { AgentManager } from './agents/manager';
import { ZGComputeClient } from './zg/compute';
import { ZGStorageClient } from './zg/storage';
import { ZGChainClient } from './zg/chain';
import { ENSResolver } from './ens/resolver';
import { startServer } from './server';
import { ethers } from 'ethers';
import { ENS_SEPOLIA_RPC } from '@agentmesh/shared';

function resolveAxlBinary(axlDir: string): string {
  const { platform, arch } = process;
  const suffix = platform === 'win32' ? '.exe' : '';
  const archMap: Record<string, string> = { x64: 'amd64', arm64: 'arm64', ia32: 'amd64' };
  const goArch = archMap[arch] || 'amd64';
  const platformName = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'darwin' : 'linux';
  const named = path.join(axlDir, `node-${platformName}-${goArch}${suffix}`);
  if (existsSync(named)) return named;
  // fallback to bare 'node' binary (original pre-built)
  return path.join(axlDir, `node${suffix}`);
}

async function main(): Promise<void> {
  console.log('=== AgentMesh Backend Starting ===');

  const privateKey = process.env.PRIVATE_KEY || '';
  // Project root is three levels up from packages/backend/src/
  const projectRoot = path.resolve(__dirname, '../../..');
  const axlDir = path.join(projectRoot, 'axl');
  const axlBinary = process.env.AXL_BINARY_PATH || resolveAxlBinary(axlDir);
  console.log(`[Init] AXL binary: ${axlBinary} (${process.platform}/${process.arch})`);
  const keysDir = process.env.KEYS_DIR
    ? path.resolve(projectRoot, process.env.KEYS_DIR)
    : path.join(projectRoot, 'keys');

  if (!privateKey) {
    console.warn('[Init] PRIVATE_KEY not set — running in demo mode (on-chain features disabled)');
  }

  // Initialize services with graceful degradation
  const mesh = new AXLMesh(axlBinary, keysDir);

  let compute: ZGComputeClient;
  try {
    compute = new ZGComputeClient(privateKey || '0x0000000000000000000000000000000000000000000000000000000000000001');
    if (privateKey) {
      await compute.initialize();
      console.log('[Init] 0G Compute client ready');
    } else {
      console.warn('[Init] 0G Compute client created (demo mode — inference will use static scan only)');
    }
  } catch (error) {
    console.warn('[Init] 0G Compute init failed (non-fatal):', error);
    compute = new ZGComputeClient('0x0000000000000000000000000000000000000000000000000000000000000001');
  }

  const storage = new ZGStorageClient(privateKey || '0x0000000000000000000000000000000000000000000000000000000000000001');
  console.log('[Init] 0G Storage client ready');

  const chain = new ZGChainClient(privateKey || '0x0000000000000000000000000000000000000000000000000000000000000001');
  console.log('[Init] 0G Chain client ready');

  const sepoliaRpc = process.env.SEPOLIA_RPC_URL || ENS_SEPOLIA_RPC;
  const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpc);
  const sepoliaSigner = privateKey
    ? new ethers.Wallet(privateKey, sepoliaProvider)
    : ethers.Wallet.createRandom().connect(sepoliaProvider);
  const ens = new ENSResolver(sepoliaProvider, sepoliaSigner);
  console.log('[Init] ENS resolver ready');

  // Create agent manager and initialize mesh
  const demoMode = !privateKey || process.env.DEMO_MODE === 'true';
  const manager = new AgentManager(mesh, compute, storage, chain, ens, demoMode);
  let agents;
  try {
    agents = await manager.initialize();
    console.log(`[Init] ${agents.length} agents initialized on AXL mesh`);
  } catch (error) {
    console.warn('[Init] Mesh initialization failed, starting with empty agent list:', error);
    agents = [];
  }

  // Start server
  await startServer(manager);
  console.log('=== AgentMesh Backend Ready ===');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await manager.shutdown();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
