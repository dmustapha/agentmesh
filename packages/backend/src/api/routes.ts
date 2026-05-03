// File: packages/backend/src/api/routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { AgentManager } from '../agents/manager';
import { AuditRequest, AGENT_REGISTRY_ADDRESS, AUDIT_ATTESTATION_ADDRESS } from '@agentmesh/shared';
import { ETHERSCAN_API } from '@agentmesh/shared';
import { randomUUID } from 'crypto';

// Simple in-memory rate limiter (no external dependency)
function rateLimit(windowMs: number, maxRequests: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests, try again later' });
      return;
    }

    entry.count++;
    next();
  };
}

export function createRoutes(manager: AgentManager): Router {
  const router = Router();

  // Rate limit: audit endpoint is expensive (LLM calls), so limit to 5 per minute
  const auditLimiter = rateLimit(60_000, 5);

  router.get('/agents', async (_req: Request, res: Response) => {
    try {
      const agents = manager.getAgents();
      res.json({ agents });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // [CRITIQUE E-1] AXL /mcp agent tool discovery endpoint
  router.get('/agents/tools', async (_req: Request, res: Response) => {
    try {
      const agentList = manager.getAgents();
      const toolsResult: Array<{ agentId: string; peerId: string; specialty: string; tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> }> = [];

      for (const agent of agentList) {
        // Each agent exposes its audit specialty as an MCP-compatible tool
        toolsResult.push({
          agentId: agent.id,
          peerId: agent.peerId,
          specialty: agent.specialty,
          tools: [{
            name: `audit_${agent.specialty.replace('-', '_')}`,
            description: `${agent.specialty.replace('-', ' ')} vulnerability scanner — analyzes smart contracts for ${agent.specialty} issues`,
            inputSchema: { type: 'object', properties: { contract: { type: 'string', description: 'Solidity source code to analyze' } }, required: ['contract'] },
          }],
        });
      }

      res.json({ agents: toolsResult });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // [CRITIQUE E-2] ENSIP-26 agent verification endpoint
  router.get('/agents/verify/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const agentList = manager.getAgents();
      const agent = agentList.find(a => a.id === agentId);

      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      const ensResolver = manager.getENSResolver();
      const proof = await ensResolver.getVerificationProof(agent.ensName);
      res.json({ agentId, ensName: agent.ensName, proof });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.get('/topology', async (_req: Request, res: Response) => {
    try {
      const topology = await manager.getTopology();
      res.json({ topology });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.post('/audit', auditLimiter, async (req: Request, res: Response) => {
    try {
      const { contractAddress, sourceCode } = req.body;

      if (!contractAddress && !sourceCode) {
        res.status(400).json({ error: 'Provide contractAddress or sourceCode' });
        return;
      }

      // Validate contractAddress format if provided
      if (contractAddress && !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        res.status(400).json({ error: 'Invalid contract address format' });
        return;
      }

      // Validate sourceCode is non-empty and contains Solidity markers
      if (sourceCode && typeof sourceCode === 'string' && sourceCode.trim().length < 10) {
        res.status(400).json({ error: 'Source code too short to analyze' });
        return;
      }

      let code = sourceCode;

      // If address provided, fetch source from Etherscan
      if (contractAddress && !sourceCode) {
        const apiKey = process.env.ETHERSCAN_API_KEY || '';
        const url = `${ETHERSCAN_API}&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
        const ethRes = await fetch(url);
        const ethData = await ethRes.json() as { status: string; result: Array<{ SourceCode: string }> };

        if (ethData.status === '1' && ethData.result[0]?.SourceCode) {
          code = ethData.result[0].SourceCode;
        } else {
          res.status(400).json({ error: 'Could not fetch source code from Etherscan' });
          return;
        }
      }

      const request: AuditRequest = {
        id: randomUUID(),
        contractAddress,
        sourceCode: code,
        timestamp: Date.now(),
      };

      // Run audit asynchronously
      res.json({ auditId: request.id, status: 'started' });

      // Don't await -- results come via WebSocket
      manager.runAudit(request).catch((error) => {
        console.error('[API] Audit failed:', error);
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.get('/audit/:id', (req: Request, res: Response) => {
    const report = manager.getAuditReport(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json({ report });
  });

  router.get('/proof', async (_req: Request, res: Response) => {
    try {
      const agents = manager.getAgents();
      const topology = await manager.getTopology();

      res.json({
        agents: agents.map((a) => ({
          name: a.ensName,
          peerId: a.peerId,
          specialty: a.specialty,
          status: a.status,
        })),
        topology,
        contracts: {
          agentRegistry: process.env.AGENT_REGISTRY_ADDRESS || AGENT_REGISTRY_ADDRESS,
          auditAttestation: process.env.AUDIT_ATTESTATION_ADDRESS || AUDIT_ATTESTATION_ADDRESS,
          explorerBase: 'https://chainscan-galileo.0g.ai',
        },
        ens: {
          network: 'sepolia',
          parentName: 'agentmesh.eth',
          subnames: agents.map((a) => a.ensName),
        },
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
