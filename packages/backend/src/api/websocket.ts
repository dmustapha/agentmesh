// File: packages/backend/src/api/websocket.ts

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { WSEvent } from '@agentmesh/shared';

export class WebSocketBroadcaster {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      (ws as unknown as { isAlive: boolean }).isAlive = true;
      console.log(`[WS] Client connected (${this.clients.size} total)`);

      ws.on('pong', () => {
        (ws as unknown as { isAlive: boolean }).isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err);
        this.clients.delete(ws);
      });
    });

    // Ping every 30s, terminate unresponsive clients
    this.heartbeatInterval = setInterval(() => {
      const dead: WebSocket[] = [];
      for (const ws of this.clients) {
        const client = ws as unknown as { isAlive: boolean };
        if (!client.isAlive) {
          dead.push(ws);
        } else {
          client.isAlive = false;
          ws.ping();
        }
      }
      for (const ws of dead) {
        this.clients.delete(ws);
        ws.terminate();
      }
    }, 30_000);

    this.wss.on('close', () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    });
  }

  broadcast(event: WSEvent): void {
    const data = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}
