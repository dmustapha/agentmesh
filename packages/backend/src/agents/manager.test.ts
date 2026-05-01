// Tests for AgentManager — audit lifecycle and agent management
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentManager } from './manager';
import type { AuditRequest } from '@agentmesh/shared';

// Mock all heavy dependencies
vi.mock('../axl/mesh', () => ({
  AXLMesh: vi.fn(),
}));
vi.mock('../axl/transport', () => {
  return {
    AXLTransport: class MockAXLTransport {
      private peerId: string;
      constructor(_client: unknown, peerId: string) {
        this.peerId = peerId;
      }
      getPeerId() { return this.peerId; }
      send() { return Promise.resolve(); }
      recv() { return Promise.resolve(null); }
    },
  };
});
vi.mock('../zg/compute', () => ({
  ZGComputeClient: vi.fn(),
}));
vi.mock('../zg/storage', () => ({
  ZGStorageClient: vi.fn(),
}));
vi.mock('../zg/chain', () => ({
  ZGChainClient: vi.fn(),
}));
vi.mock('../ens/resolver', () => ({
  ENSResolver: vi.fn(),
}));

function createMockDeps() {
  const mesh = {
    start: vi.fn().mockResolvedValue([
      { specialty: 'reentrancy', port: 9002, client: {}, peerId: 'peer-1' },
      { specialty: 'access-control', port: 9003, client: {}, peerId: 'peer-2' },
    ]),
    stop: vi.fn().mockResolvedValue(undefined),
    getTopology: vi.fn().mockResolvedValue(
      new Map([
        ['reentrancy', { peerId: 'peer-1', peers: ['peer-2'] }],
        ['access-control', { peerId: 'peer-2', peers: ['peer-1'] }],
      ]),
    ),
  };

  const compute = {
    chat: vi.fn().mockResolvedValue('{"findings":[]}'),
  };

  const storage = {
    uploadReport: vi.fn().mockResolvedValue({ rootHash: '0xstoragehash' }),
  };

  const chain = {
    registerAgent: vi.fn().mockResolvedValue(undefined),
    attest: vi.fn().mockResolvedValue('0xtxhash'),
  };

  const ens = {
    registerAgent: vi.fn().mockResolvedValue(undefined),
    getVerificationProof: vi.fn().mockResolvedValue({ verified: true }),
  };

  return { mesh, compute, storage, chain, ens };
}

describe('AgentManager', () => {
  let deps: ReturnType<typeof createMockDeps>;
  let manager: AgentManager;

  beforeEach(async () => {
    deps = createMockDeps();
    manager = new AgentManager(
      deps.mesh as any,
      deps.compute as any,
      deps.storage as any,
      deps.chain as any,
      deps.ens as any,
      true, // demoMode — skip on-chain registration
    );
    await manager.initialize();
  });

  it('initializes agents from mesh nodes', () => {
    const agents = manager.getAgents();
    expect(agents).toHaveLength(2);
    expect(agents[0].specialty).toBe('reentrancy');
    expect(agents[1].specialty).toBe('access-control');
  });

  it('returns topology from mesh', async () => {
    const topo = await manager.getTopology();
    expect(topo).toHaveProperty('reentrancy');
    expect(topo.reentrancy.peerId).toBe('peer-1');
  });

  it('returns null for unknown audit report', () => {
    expect(manager.getAuditReport('nonexistent')).toBeNull();
  });

  it('exposes ENS resolver', () => {
    const resolver = manager.getENSResolver();
    expect(resolver).toBeDefined();
  });

  it('shuts down cleanly', async () => {
    await manager.shutdown();
    expect(deps.mesh.stop).toHaveBeenCalled();
    expect(manager.getAgents()).toHaveLength(0);
  });
});
