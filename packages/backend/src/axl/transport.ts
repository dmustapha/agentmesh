// File: packages/backend/src/axl/transport.ts

import { AXLMessage } from '@agentmesh/shared';
import { AXLClient } from './client';

export interface Transport {
  send(destinationPeerId: string, message: AXLMessage): Promise<void>;
  recv(): Promise<{ fromPeerId: string; message: AXLMessage } | null>;
  getPeerId(): string;
  isConnected(): Promise<boolean>;
}

export class AXLTransport implements Transport {
  private client: AXLClient;
  private peerId: string;

  constructor(client: AXLClient, peerId: string) {
    this.client = client;
    this.peerId = peerId;
  }

  async send(destinationPeerId: string, message: AXLMessage): Promise<void> {
    await this.client.sendMessage(destinationPeerId, message);
  }

  async recv(): Promise<{ fromPeerId: string; message: AXLMessage } | null> {
    return this.client.recvMessage();
  }

  getPeerId(): string {
    return this.peerId;
  }

  async isConnected(): Promise<boolean> {
    return this.client.isAlive();
  }
}

// WebSocket fallback transport (used if AXL is unstable)
export class WSTransport implements Transport {
  private peerId: string;
  private peers: Map<string, WebSocket> = new Map();
  private inbound: Array<{ fromPeerId: string; message: AXLMessage }> = [];

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  async send(destinationPeerId: string, message: AXLMessage): Promise<void> {
    const ws = this.peers.get(destinationPeerId);
    if (!ws) {
      throw new Error(`No WebSocket connection to peer ${destinationPeerId}`);
    }
    ws.send(JSON.stringify(message));
  }

  async recv(): Promise<{ fromPeerId: string; message: AXLMessage } | null> {
    return this.inbound.shift() || null;
  }

  getPeerId(): string {
    return this.peerId;
  }

  async isConnected(): Promise<boolean> {
    return true;
  }

  addPeer(peerId: string, ws: WebSocket): void {
    this.peers.set(peerId, ws);
    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as AXLMessage;
        this.inbound.push({ fromPeerId: peerId, message });
      } catch {
        console.warn('WSTransport: invalid message received');
      }
    });
  }
}
