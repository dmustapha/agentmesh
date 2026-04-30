// File: packages/backend/src/api/websocket.ts

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { WSEvent } from '@agentmesh/shared';

export class WebSocketBroadcaster {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected (${this.clients.size} total)`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err);
        this.clients.delete(ws);
      });
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
