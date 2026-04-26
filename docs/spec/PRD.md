# AgentMesh: Product Requirements Document

ETHGlobal Open Agents hackathon, targeting the Gensyn AXL, 0G Labs Track A, and ENS prize tracks,
with a hard deadline of May 3, 2026.

---

## Problem

$3.8 billion was lost to smart contract exploits in 2025. Current audit options are centralized
(you submit your contract to a firm and wait), expensive ($50K-$500K per engagement), and
inaccessible to independent developers or small teams who ship unaudited because they can't afford
professional review. At the same time, AI agents lack any decentralized communication
infrastructure, so they depend on central servers, proprietary APIs, and cloud brokers that create
single points of failure, and there's no standard way for AI agents to discover each other, verify
identity, or communicate peer-to-peer.

---

## Solution

AgentMesh is two things simultaneously: a decentralized P2P agent infrastructure, and a working
example of what that infrastructure can do. Four specialized AI agents (one focused on reentrancy
patterns, one on access control bugs, one on logic errors, one on economic exploits) run as
independent processes communicating over Gensyn AXL. They register identities on ENS using
ENSIP-25 text records, prove ownership via ENSIP-26 verification, discover each other through
ENS resolution, and run LLM inference through 0G Compute. When a user submits a contract, the
agents analyze in parallel, share findings over the P2P mesh, reach consensus, and store the final
report on 0G Storage with an on-chain attestation on 0G Chain.

---

## Core User Flows

### Viewing the mesh (no interaction required)

The dashboard loads and immediately shows the AXL topology graph with four agent nodes labeled by
their ENS names, connection lines indicating active P2P links, and live status indicators. No
wallet required, no login, because the point is to show the infrastructure rather than gate it
behind authentication.

### Submitting a contract for audit

The user pastes a contract address or Solidity source code into the audit form and clicks Start
Audit. The backend distributes the contract to all four agents via AXL /send, each agent analyzes
using 0G Compute inference and shares findings with the other agents, and the consensus engine
aggregates the results. Real-time updates stream via WebSocket so the chat feed shows actual
inter-agent AXL messages as they arrive, and a complete report (30-60 seconds from submission) goes
to 0G Storage and gets attested on 0G Chain.

### Viewing proof of integration

The /proof route collects all verifiable evidence in one place: ENS text record links for all four
agents, ENSIP-26 verification signatures, 0G Chain contract addresses, an AXL topology screenshot,
the 0G Storage rootHash from a completed audit, and the attestation transaction hash. This route
exists specifically for judges who want to verify that the integrations are real and not mocked.

---

## What Success Looks Like

A judge opens the live URL and sees a mesh topology graph with four running agent nodes labeled by
their ENS names. They paste a vulnerable contract address and watch agents begin analyzing in
parallel. The chat feed shows messages between agents discussing findings. A consensus report
appears with severity-rated vulnerabilities. They click the 0G Chain attestation link and it opens
a real transaction on the block explorer. They open the /proof page and can verify every
integration independently. That's the 60-second judge experience, and everything else in this
document is in service of that.

---

## Decision Log

These are product decisions that didn't fall out of the architecture automatically and required
actual choices.

WebSocket was chosen over polling for the real-time update feed because polling every second would
have worked technically, but the chat feed specifically (where you're watching agent messages appear
in sequence as they happen) requires genuine push delivery. A 1-second poll would cause messages to
jump into existence in batches rather than streaming in one by one, which would undermine the effect
of watching agents actually communicate with each other over the P2P mesh. That effect is probably
the highest-impact moment in the demo.

Four agent specializations and not three or five: the four categories (reentrancy, access control,
logic, economic) map to the major DeFi vulnerability classes in a way that feels complete rather
than arbitrary. Dropping economic exploits would exclude flash loans and oracle manipulation, which
represent a significant portion of actual DeFi losses, and adding a fifth category like gas
optimization was briefly considered but would dilute the focus without adding proportional demo
value.

The proof page is a separate route rather than embedded in the main dashboard because judges who
want to verify integrations and users who want to submit contracts are doing completely different
things. One is inspecting evidence, the other is using a tool, and mixing them means either the
dashboard feels cluttered to normal users or the proof section feels too minimal for judges. A
dedicated /proof route lets each serve its purpose without compromising the other.

Both ENSIP-25 and ENSIP-26 are implemented even though ENSIP-25 alone would have been enough for
basic agent registration. The reason ENSIP-26 was added is that it proves the agent actually
controls the ENS name rather than just having had metadata written there by someone else, which
makes the identity claims verifiable rather than merely asserted. The added complexity was a few
additional lines in the ENS resolver service.

Wallet connect is not required to view the dashboard or submit a contract, because requiring it
would cut off probably 80% of people who try the demo. A judge evaluating the project or a
developer testing the audit flow should both be able to reach the interesting part without a wallet
setup step. On-chain attestation tied to the submitter's address would be a production feature,
not a hackathon one.

---

## Open Questions (as of project start)

These are the open questions going into the build. I'll note resolutions as they come up.

Whether AXL can run multiple instances on the same machine isn't clear yet. The obvious approach
is different ports and different key files so each instance gets a distinct peer ID, but this hasn't
been tested and it's possible the binary has constraints that prevent it.

What the 0G testnet faucet rate limits actually are still isn't fully answered. The burn rate per
inference call is hard to estimate from the documentation so I budgeted conservatively at 5 tokens
per full audit run.

Whether the public ENS resolver supports ENSIP-25 text record key formats is an open question.
The spec defines specific key naming conventions and it's not clear from the documentation whether
the standard PublicResolver on Sepolia handles arbitrary text record keys or whether a custom
resolver is needed.

Whether the 0G Storage indexer is stable enough to rely on without a fallback is unclear. The
plan is to build a local cache fallback so that if the upload fails, the report can still be
attested using a local hash. May also need to pre-confirm a session before recording to avoid live
testnet failures showing up mid-demo.

For the topology graph, the plan is to poll the AXL /topology endpoint rather than push topology
events over WebSocket, since topology changes happen slowly. Whether a 2-second polling interval
feels responsive enough on the graph is something to verify during implementation.

If an AXL node crashes mid-audit, the consensus engine needs to handle partial responses
gracefully rather than hanging or failing completely. The current plan is a per-agent timeout and
consensus over whatever arrives, with the report noting degraded mode if fewer than 4 agents
contributed.

---

## Scope Boundaries

What's in: four specialized agents over AXL, ENS with ENSIP-25 and ENSIP-26, 0G Compute inference,
0G Storage for report persistence, 0G Chain attestation, a dashboard with topology graph and audit
flow and proof page, and two contracts deployed on 0G Chain.

What's deliberately out: more than four agent types, ZK proofs or formal verification, multi-chain
contract support, production-grade security or rate limiting on the API, user accounts or audit
history persistence, and mobile-responsive design. The dashboard uses high information density that
doesn't translate well to small screens, and desktop-only is a reasonable constraint for a developer
tool demo.

The point is not to build a production auditing company but to demonstrate what decentralized agent
infrastructure looks like when all three sponsor integrations are genuinely load-bearing.

---

## Demo Prerequisites

What has to exist before recording starts:

- Four AXL instances running on ports 9002-9005 (scripts/start-mesh.sh)
- agentmesh.eth registered on Sepolia with ENSIP-25/26 records for all four subnames
- AgentRegistry and AuditAttestation contracts deployed on 0G Chain Testnet (chain ID 16602)
- One pre-completed audit in 0G Storage (rootHash in the proof page)
- One pre-seeded vulnerable contract on Sepolia (known reentrancy bug, known findings)
- 0G wallet funded with enough tokens for at least three full audit runs
- Backend running on localhost:3001, frontend on localhost:3000

The seed-demo.ts script is designed to produce this entire state from scratch and be idempotent,
so running it twice shouldn't create duplicate registrations or fail with conflicts.

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| AXL binary instability | Critical | Test in first 4 hours; WebSocket fallback with identical API |
| 0G Compute model quality | Critical | Tuned system prompts; mainnet fallback model |
| Cross-node AXL failing | Critical | Early test; separate terminals showing distinct ports as proof |
| ENS ENSIP-25 support | High | Day 1 text record write test; standard records as fallback |
| 0G Storage indexer down | High | Local cache fallback; pre-record demo in stable session |
| 0G Chain congestion | High | Pre-deploy contracts; Sepolia fallback if needed |
| Scope creep | Medium | Scope locked at 4 agents, 1 audit type, no additions |
| Agent consensus wrong results | Medium | Pre-seed known vulnerable contract; tune prompts to match |
