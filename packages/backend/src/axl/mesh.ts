// File: packages/backend/src/axl/mesh.ts

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { AXL_PORTS, AXL_HOST, AGENT_SPECIALTIES } from '@agentmesh/shared';
import { AXLClient } from './client';
import type { AgentSpecialty } from '@agentmesh/shared';

export interface MeshNode {
  specialty: AgentSpecialty;
  port: number;
  process: ChildProcess | null;
  client: AXLClient;
  peerId: string;
  keyPath: string;
}

export class AXLMesh {
  private nodes: Map<AgentSpecialty, MeshNode> = new Map();
  private axlBinaryPath: string;
  private keysDir: string;

  constructor(axlBinaryPath: string, keysDir: string) {
    this.axlBinaryPath = axlBinaryPath;
    this.keysDir = keysDir;
  }

  async start(): Promise<MeshNode[]> {
    // Priority order:
    // 1. Attach to already-running nodes (start-mesh.sh, Docker, external) — no binary or key check needed.
    // 2. Spawn nodes ourselves if binary + keys exist.
    // 3. Simulated fallback.

    const firstClient = new AXLClient(AXL_HOST, AXL_PORTS[0]);
    const alreadyRunning = await firstClient.isAlive();

    if (alreadyRunning) {
      console.log('[Mesh] Detected running AXL nodes — attaching to existing mesh');
      return this.attachToRunningNodes();
    }

    // Nodes not running — try to spawn them.
    if (!existsSync(this.axlBinaryPath)) {
      console.warn(`[Mesh] AXL binary not found at ${this.axlBinaryPath} — creating simulated mesh nodes`);
      return this.createSimulatedNodes();
    }

    for (let i = 0; i < AGENT_SPECIALTIES.length; i++) {
      const keyPath = path.join(this.keysDir, `agent-${i}-private.pem`);
      if (!existsSync(keyPath)) {
        console.warn(`[Mesh] Key file not found: ${keyPath} — creating simulated mesh nodes`);
        return this.createSimulatedNodes();
      }
    }

    // Spawn nodes with correct AXL config format (hub-spoke topology)
    const LISTEN_PORT = 9001;
    const TCP_PORTS = [7000, 7001, 7002, 7003];
    const startedNodes: MeshNode[] = [];

    for (let i = 0; i < AGENT_SPECIALTIES.length; i++) {
      const specialty = AGENT_SPECIALTIES[i];
      const port = AXL_PORTS[i];
      const keyPath = path.join(this.keysDir, `agent-${i}-private.pem`);

      const config: Record<string, unknown> = {
        PrivateKeyPath: keyPath,
        Peers: i === 0 ? [] : [`tls://127.0.0.1:${LISTEN_PORT}`],
        Listen: i === 0 ? [`tls://0.0.0.0:${LISTEN_PORT}`] : [],
        api_port: port,
        bridge_addr: '127.0.0.1',
        tcp_port: TCP_PORTS[i],
      };

      const configPath = path.join(this.keysDir, `node-config-${i}.json`);
      const { writeFileSync } = await import('fs');
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const proc = spawn(this.axlBinaryPath, ['-config', configPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[AXL:${specialty}:${port}] ${msg}`);
      });

      // Give hub node time to start listening before spokes connect
      if (i === 0) await new Promise((r) => setTimeout(r, 3000));

      const client = new AXLClient(AXL_HOST, port);

      let ready = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (await client.isAlive()) {
          ready = true;
          break;
        }
      }

      if (!ready) {
        proc.kill();
        throw new Error(`AXL node ${specialty} on port ${port} failed to start after 30s`);
      }

      const topology = await client.topology();
      const peerId = topology.ourPublicKey;

      const node: MeshNode = {
        specialty,
        port,
        process: proc,
        client,
        peerId,
        keyPath,
      };

      this.nodes.set(specialty, node);
      startedNodes.push(node);
      console.log(`[Mesh] Started ${specialty} agent on :${port} peerId=${peerId.slice(0, 16)}...`);
    }

    await new Promise((r) => setTimeout(r, 5000));
    return startedNodes;
  }

  private async attachToRunningNodes(): Promise<MeshNode[]> {
    const nodes: MeshNode[] = [];
    for (let i = 0; i < AGENT_SPECIALTIES.length; i++) {
      const specialty = AGENT_SPECIALTIES[i];
      const port = AXL_PORTS[i];
      const keyPath = path.join(this.keysDir, `agent-${i}-private.pem`);
      const client = new AXLClient(AXL_HOST, port);

      let peerId = `unknown-${specialty}`;
      try {
        const topology = await client.topology();
        peerId = topology.ourPublicKey;
      } catch {
        console.warn(`[Mesh] Could not get topology for ${specialty} on :${port}`);
      }

      const node: MeshNode = {
        specialty,
        port,
        process: null, // not managed by us
        client,
        peerId,
        keyPath,
      };

      this.nodes.set(specialty, node);
      nodes.push(node);
      console.log(`[Mesh] Attached to ${specialty} agent on :${port} peerId=${peerId.slice(0, 16)}...`);
    }
    return nodes;
  }

  private createSimulatedNodes(): MeshNode[] {
    const nodes: MeshNode[] = [];
    for (let i = 0; i < AGENT_SPECIALTIES.length; i++) {
      const specialty = AGENT_SPECIALTIES[i];
      const port = AXL_PORTS[i];
      const keyPath = path.join(this.keysDir, `agent-${i}-private.pem`);
      const client = new AXLClient(AXL_HOST, port);
      const peerId = `sim-peer-${specialty}-${port}`;

      const node: MeshNode = {
        specialty,
        port,
        process: null,
        client,
        peerId,
        keyPath,
      };

      this.nodes.set(specialty, node);
      nodes.push(node);
      console.log(`[Mesh] Simulated ${specialty} agent on :${port} peerId=${peerId}`);
    }
    return nodes;
  }

  getNode(specialty: AgentSpecialty): MeshNode | undefined {
    return this.nodes.get(specialty);
  }

  getAllNodes(): MeshNode[] {
    return Array.from(this.nodes.values());
  }

  async getTopology(): Promise<Map<AgentSpecialty, { peerId: string; peers: string[] }>> {
    const result = new Map<AgentSpecialty, { peerId: string; peers: string[] }>();
    for (const [specialty, node] of this.nodes) {
      try {
        const topo = await node.client.topology();
        result.set(specialty, { peerId: topo.ourPublicKey, peers: topo.peers });
      } catch {
        result.set(specialty, { peerId: node.peerId, peers: [] });
      }
    }
    return result;
  }

  async stop(): Promise<void> {
    const killPromises: Promise<void>[] = [];
    for (const [specialty, node] of this.nodes) {
      if (node.process) {
        killPromises.push(
          new Promise<void>((resolve) => {
            const proc = node.process!;
            const forceKillTimer = setTimeout(() => {
              proc.kill('SIGKILL');
              console.warn(`[Mesh] Force-killed ${specialty} agent (SIGTERM timeout)`);
              resolve();
            }, 5000);
            proc.once('exit', () => {
              clearTimeout(forceKillTimer);
              resolve();
            });
            proc.kill('SIGTERM');
            console.log(`[Mesh] Stopping ${specialty} agent on :${node.port}`);
          }),
        );
      }
    }
    await Promise.all(killPromises);
    this.nodes.clear();
  }
}
