// File: packages/backend/src/axl/client.ts

import { TopologyData, AXLMessage } from '@agentmesh/shared';

export class AXLClient {
  private baseUrl: string;

  constructor(host: string, port: number) {
    this.baseUrl = `http://${host}:${port}`;
  }

  async send(destinationPeerId: string, data: Buffer | string): Promise<number> {
    const body = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const res = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'X-Destination-Peer-Id': destinationPeerId,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`AXL send failed: ${res.status} ${res.statusText}`);
    }

    return parseInt(res.headers.get('X-Sent-Bytes') || '0', 10);
  }

  async sendMessage(destinationPeerId: string, message: AXLMessage): Promise<number> {
    const payload = JSON.stringify(message);
    return this.send(destinationPeerId, payload);
  }

  async recv(): Promise<{ fromPeerId: string; data: Buffer } | null> {
    const res = await fetch(`${this.baseUrl}/recv`, { signal: AbortSignal.timeout(10000) });

    if (res.status === 204) {
      return null; // No messages
    }

    if (!res.ok) {
      throw new Error(`AXL recv failed: ${res.status}`);
    }

    const fromPeerId = res.headers.get('X-From-Peer-Id') || '';
    const arrayBuffer = await res.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    return { fromPeerId, data };
  }

  async recvMessage(): Promise<{ fromPeerId: string; message: AXLMessage } | null> {
    const result = await this.recv();
    if (!result) return null;

    try {
      const message = JSON.parse(result.data.toString('utf-8')) as AXLMessage;
      return { fromPeerId: result.fromPeerId, message };
    } catch {
      console.warn('AXL: received non-JSON message, ignoring');
      return null;
    }
  }

  async topology(): Promise<TopologyData> {
    const res = await fetch(`${this.baseUrl}/topology`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`AXL topology failed: ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;
    return {
      ourIpv6: data.our_ipv6 as string,
      ourPublicKey: data.our_public_key as string,
      peers: data.peers as string[],
      tree: data.tree as unknown[],
    };
  }

  async mcpCall(peerId: string, service: string, method: string, params: unknown = {}): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/mcp/${peerId}/${service}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        id: Date.now(),
        params,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`AXL MCP call failed: ${res.status}`);
    }

    return res.json();
  }

  async isAlive(): Promise<boolean> {
    try {
      await this.topology();
      return true;
    } catch {
      return false;
    }
  }
}
