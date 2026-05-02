// File: packages/backend/src/server.ts

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createRoutes } from './api/routes';
import { WebSocketBroadcaster } from './api/websocket';
import { AgentManager } from './agents/manager';
import { BACKEND_PORT } from '@agentmesh/shared';

export async function startServer(manager: AgentManager): Promise<void> {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  const routes = createRoutes(manager);
  app.use('/api', routes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', agents: manager.getAgents().length });
  });

  // Global error handler — returns JSON instead of HTML stack traces
  app.use((err: Error & { type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Invalid JSON in request body' });
      return;
    }
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body too large' });
      return;
    }
    console.error('[Server] Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  const server = createServer(app);
  const broadcaster = new WebSocketBroadcaster(server);
  manager.setBroadcaster(broadcaster);

  return new Promise((resolve) => {
    server.listen(BACKEND_PORT, () => {
      console.log(`[Server] Backend running on http://localhost:${BACKEND_PORT}`);
      console.log(`[Server] WebSocket on ws://localhost:${BACKEND_PORT}/ws`);
      resolve();
    });
  });
}
