# AgentMesh: Build Plan

Living document. Updated as work gets done. Acceptance criteria listed per task so it's clear
what "done" actually means.

---

## Status Key

- [x] Complete: shipped and working
- [~] Partial: started but not finished
- [ ] Not started

---

## Phase 0: Infrastructure Validation (Day 1)

These had to be proven before anything else, because if AXL doesn't work or 0G Compute is broken
the entire architecture falls apart.

- [x] AXL binary runs on local machine (arm64, Mach-O confirmed)
  - Acceptance: `./axl/node --port 9002 --key-file keys/agent0.pem` starts without error
  - Acceptance: GET /topology returns JSON with our_public_key field

- [x] Two AXL instances send messages to each other (cross-process)
  - Acceptance: POST /send from port 9002 to peer ID of 9003, GET /recv on 9003 returns the message
  - This was the critical unknown; confirmed cross-node routing works via Yggdrasil overlay

- [x] 0G Compute inference call works
  - Acceptance: @0glabs/0g-serving-broker initialized, one chat completions request returns a
    non-empty response from qwen-2.5-7b-instruct
  - Note: testnet can be slow; p95 latency around 8-12 seconds per call

- [x] ENS text record write on Sepolia
  - Acceptance: write one text record to a test ENS name, read it back via ethers.js
  - Confirmed: standard PublicResolver supports arbitrary text record keys, ENSIP-25 works

- [x] 0G Storage upload returns rootHash
  - Acceptance: upload a JSON object, get back a rootHash string, retrieve it via rootHash
  - Note: testnet indexer can be slow; add 30s timeout to avoid hanging

---

## Phase 1: Contracts (Day 2)

- [x] AgentRegistry deployed to 0G Chain Testnet (16602)
  - Acceptance: contract address recorded, registerAgent tx succeeds, getAgent returns data
  - Acceptance: 4 agent addresses registered with name, capability, peerId

- [x] AuditAttestation deployed to 0G Chain Testnet
  - Acceptance: attest() tx succeeds, getAttestation returns the stored data
  - Acceptance: storageRootHash field stores 0G Storage root from a test upload

- [x] ENS registration: agentmesh.eth + 4 subnames on Sepolia
  - Acceptance: all 4 subnames resolvable via ethers.js
  - Acceptance: ENSIP-25 text records set and readable for each agent
  - Acceptance: ENSIP-26 verification records set (challenge + signature)
  - Note: parent name registration is a manual step at sepolia.app.ens.domains

---

## Phase 2: Backend Core (Days 2-3)

- [x] AXL client module
  - Acceptance: send(peerId, message), recv(), getTopology() all work against running AXL instances
  - Acceptance: handles 204 (no messages) from recv without throwing

- [x] Agent manager
  - Acceptance: spawnAgent(specialty) starts an AXL process on the right port with the right key
  - Acceptance: broadcastToMesh(message) sends to all four peer IDs
  - Acceptance: 30-second timeout on agent responses; degraded mode if fewer than 4 respond

- [x] ENS resolver service
  - Acceptance: registerAgent(name, peerId, capabilities) writes ENSIP-25 text records
  - Acceptance: discoverAgents(parentName) returns all registered agents under agentmesh.eth
  - Acceptance: verifyAgent(address, challenge) validates ENSIP-26 signature

- [x] 0G Compute client
  - Acceptance: analyzeContract(source, specialty) returns structured finding objects
  - Acceptance: system prompts tuned per specialty; reentrancy prompt reliably finds reentrancy in
    the test vulnerable contract

- [x] 0G Chain client
  - Acceptance: registerAgent() on AgentRegistry, attest() on AuditAttestation both work
  - Acceptance: returned tx hashes are valid and confirmable on chainscan-galileo.0g.ai

- [x] 0G Storage client
  - Acceptance: uploadReport(report) returns rootHash within 30 seconds on testnet
  - Acceptance: local cache fallback works if indexer is unresponsive

- [x] Consensus engine
  - Acceptance: aggregateFindings(findings[]) produces a ConsensusResult with correct severity
  - Acceptance: 3/4 agreement on a known finding correctly produces CRITICAL in output
  - Acceptance: unit tests pass (consensus.test.ts)

---

## Phase 3: Backend API + Server (Day 4)

- [x] POST /api/audit (start an audit, distribute via AXL, stream results via WebSocket)
- [x] GET /api/agents (return all registered agents with ENS names and status)
- [x] GET /api/topology (aggregate topology from all 4 AXL /topology endpoints)
- [x] WebSocket /ws (events: agent:status, agent:message, audit:finding, audit:complete)
- [x] GET /api/agents/tools (query each agent's MCP tools via AXL /mcp proxy)

---

## Phase 4: Frontend (Day 5)

- [x] Topology graph (D3.js force-directed)
  - Acceptance: shows 4 nodes with ENS names, connection lines
  - Acceptance: polls /api/topology every 2s, nodes animate on status change

- [x] Audit form and chat feed
  - Acceptance: accepts contract address or Solidity source
  - Acceptance: WebSocket chat feed shows inter-agent messages in real time as they arrive

- [x] Report view
  - Acceptance: severity-sorted findings, evidence sections, agent voting breakdown
  - Acceptance: links to 0G Chain attestation tx and 0G Storage rootHash

- [x] Proof page (/proof)
  - Acceptance: all 4 ENS registration links visible
  - Acceptance: ENSIP-26 verification proof per agent
  - Acceptance: contract addresses with block explorer links
  - Acceptance: sample rootHash and attestation tx from pre-seeded audit

---

## Phase 5: Integration + Polish (Day 6, check-in #2)

- [x] seed-demo.ts (idempotent script that creates all demo prerequisites from scratch)
  - Acceptance: running it twice produces same ENS records, same contracts, no duplicate errors
  - Acceptance: pre-seeded vulnerable contract on Sepolia has known reentrancy bug

- [~] End-to-end audit flow (paste the pre-seeded vulnerable contract, get a report with the
  expected reentrancy finding at CRITICAL severity)
  - Audit flow works end to end; reentrancy finding appears consistently
  - Still need to verify attestation link resolves on block explorer before recording

- [ ] scripts/start-mesh.sh (one command to start all 4 AXL instances)
- [ ] README updated with setup instructions

---

## Phase 6: Demo + Submission (Days 7-8)

- [ ] Demo video recorded (3 minutes, scripted per PRD section 6)
- [ ] Architecture diagram SVG (docs/architecture.svg)
- [ ] README final version
- [ ] Submission package: video, GitHub URL, live URL, contract addresses, proof artifacts
- [ ] Check-in #2 via Hacker Dashboard (May 1, 11:59 PM EDT)
- [ ] Final submission (May 3, before 4:00 PM EDT)

---

## Items Deprioritized

These were considered and explicitly cut to protect scope:

- A fifth agent type (originally considered "gas optimization agent") was cut because 4 categories
  cover the major DeFi attack surface and a 5th would add demo complexity without proportional value.

- Multi-chain support (Solidity on multiple EVM chains) was cut to keep the architecture
  comprehensible. One contract format, one demo flow.

- User authentication and audit history were cut because they add backend complexity and aren't
  needed for the judging criteria (technicality, originality, practicality, usability, WOW factor).
  Pre-seeded audit history serves the judge experience requirement.

- Mobile-responsive layout was dropped because the dashboard uses high visual density that doesn't
  translate well to small screens. Desktop-only is a reasonable constraint for a developer tool demo.

---

## Check-in Schedule

| Date | What to show | Submission method |
|------|-------------|-------------------|
| Apr 28, 11:59 PM EDT | Working AXL mesh, cross-node test screenshot, ENS subnames registered | ETHGlobal Hacker Dashboard |
| May 1, 11:59 PM EDT | Full working demo, 0G attestation tx hash, ENS resolution working | ETHGlobal Hacker Dashboard |

---

## Next Commit: Bug fixes + doc updates

### Bug: key filename mismatch (critical)
`scripts/setup.sh` generates `keys/node-9002.pem` etc.
`packages/backend/src/axl/mesh.ts` line 44 checks for `agent-0-private.pem` etc. BEFORE checking `isAlive()`.
Fix: swap check order in `mesh.ts` — check `isAlive()` first, THEN do key file check only if trying to spawn.
Also: rename keys in setup.sh to match OR update mesh.ts to accept either naming convention.

### Bug: binaries in git (~85MB)
Add `axl/node-*` (except bare `node`) to `.gitignore`. Setup.sh builds them on demand.

### Docs to update (3 files, 4 locations)
1. `docs/spec/ARCHITECTURE.md` lines 32-36 — replace "arm64 only" constraint with cross-platform status
2. `docs/spec/ARCHITECTURE.md` lines 174-176 — update "Apple Silicon required" note
3. `docs/spec/RESEARCH.md` lines 27-30 — replace "only runs on Apple Silicon" paragraph
