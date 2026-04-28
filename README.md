# AgentMesh

> Decentralized P2P agent mesh for smart contract security auditing

**ETHGlobal Open Agents 2026** | Tracks: Gensyn AXL + 0G Labs + ENS

## What is AgentMesh?

AgentMesh is a decentralized AI agent infrastructure where 4 specialized security agents discover each other via **ENS** names, communicate peer-to-peer through **Gensyn AXL**, run inference through **0G Compute**, and collaboratively audit smart contracts with on-chain attestations.

$3.8B was lost to smart contract exploits in 2025. Current audit tools are centralized, single-model, and expensive. AgentMesh makes security auditing decentralized, multi-agent, and verifiable.

## Architecture

```
Dashboard (Next.js) <-> Backend (Express+WS) <-> AXL P2P Mesh (4 nodes)
                              |
              +---------------+---------------+
              |               |               |
         ENS Sepolia    0G Compute      0G Storage
         (ENSIP-25)     (LLM inference) (Report persistence)
                              |
                        0G Chain 16602
                     (AgentRegistry + AuditAttestation)
```

**4 Specialized Agents:**
- **ReentrancyAgent** -- detects reentrancy vulnerabilities
- **AccessControlAgent** -- analyzes access control issues
- **LogicAgent** -- finds business logic flaws
- **EconomicAgent** -- evaluates economic attack vectors

Each agent registers on ENS, joins the AXL mesh, analyzes contracts via 0G Compute, and debates findings with peers before reaching consensus.

## Sponsor Integration Depth

| Sponsor | Integration | Details |
|---------|-------------|---------|
| **Gensyn AXL** | Deep | 4-node P2P mesh, /send /recv /topology, MCP tool discovery via /mcp, hub-spoke topology |
| **ENS** | Deep | ENSIP-25 agent registration, ENSIP-26 verification, subname management, capability discovery |
| **0G Labs** | Deep | Compute (LLM inference), Storage (report persistence), Chain (AgentRegistry + AuditAttestation contracts on testnet 16602) |

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 9+

# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your PRIVATE_KEY and SEPOLIA_RPC_URL

# 3. Start the AXL mesh (requires AXL binary)
bash scripts/start-mesh.sh

# 4. Start the backend
cd packages/backend && npx tsx src/index.ts

# 5. Start the frontend (separate terminal)
cd packages/frontend && pnpm dev

# Dashboard: http://localhost:3000
# Backend: http://localhost:3001
```

## How It Works

1. User submits a smart contract address or Solidity source code
2. Backend distributes the contract to 4 specialized agents via AXL P2P mesh
3. Each agent analyzes using its specialty (reentrancy, access control, logic, economic)
4. Agents share findings and debate via AXL messaging
5. Consensus Engine aggregates findings with weighted voting
6. Final report stored on 0G Storage, attestation written to 0G Chain
7. Dashboard shows real-time progress: mesh topology, agent chat, vulnerability findings

## Smart Contracts

Deployed on **0G Chain Testnet (16602)**:

| Contract | Address | Purpose |
|----------|---------|---------|
| AgentRegistry | `0xd07B4222D25feB1Db2d87E512Ed0Cbf88c105F3A` | On-chain agent identity and capability registration |
| AuditAttestation | `0x544097E0446a42eD6A298cDe34227Da559f25011` | On-chain attestation of audit findings |

Explorer: [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai)

## Project Structure

```
agentmesh/
  contracts/           # Solidity (Foundry) - AgentRegistry + AuditAttestation
  packages/
    shared/            # Shared types, constants, agent prompts
    backend/           # Express + WebSocket server, AXL mesh, agent manager
    frontend/          # Next.js 14 dashboard with D3.js topology visualization
  scripts/             # AXL mesh management, contract deployment, demo seeding
```

## Tech Stack

TypeScript, Next.js 14, Express, Solidity 0.8.19, Foundry, ethers.js v6, D3.js, pnpm monorepo

## License

MIT
