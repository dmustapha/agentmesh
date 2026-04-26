# AgentMesh: Build Plan

Living document. Updated as work gets done. Acceptance criteria listed per task so it's clear
what "done" actually means.

---

## Status Key

- [ ] Complete: shipped and working
- [ ] Partial: started but not finished
- [ ] Not started

---

## Phase 0: Infrastructure Validation (Day 1)

These had to be proven before anything else, because if AXL doesn't work or 0G Compute is broken
the entire architecture falls apart.

- [ ] AXL binary runs on local machine (arm64, Mach-O confirmed)
  - Acceptance: `./axl/node --port 9002 --key-file keys/agent0.pem` starts without error
  - Acceptance: GET /topology returns JSON with our_public_key field

- [ ] Two AXL instances send messages to each other (cross-process)
  - Acceptance: POST /send from port 9002 to peer ID of 9003, GET /recv on 9003 returns the message

- [ ] 0G Compute inference call works
  - Acceptance: @0glabs/0g-serving-broker initialized, one chat completions request returns a
    non-empty response from qwen-2.5-7b-instruct

- [ ] ENS text record write on Sepolia
  - Acceptance: write one text record to a test ENS name, read it back via ethers.js

- [ ] 0G Storage upload returns rootHash
  - Acceptance: upload a JSON object, get back a rootHash string, retrieve it via rootHash

---

## Phase 1: Contracts (Day 2)

- [ ] AgentRegistry deployed to 0G Chain Testnet (16602)
  - Acceptance: contract address recorded, registerAgent tx succeeds, getAgent returns data
  - Acceptance: 4 agent addresses registered with name, capability, peerId

- [ ] AuditAttestation deployed to 0G Chain Testnet
  - Acceptance: attest() tx succeeds, getAttestation returns the stored data
  - Acceptance: storageRootHash field stores 0G Storage root from a test upload

- [ ] ENS registration: agentmesh.eth + 4 subnames on Sepolia
  - Acceptance: all 4 subnames resolvable via ethers.js
  - Acceptance: ENSIP-25 text records set and readable for each agent
  - Acceptance: ENSIP-26 verification records set (challenge + signature)
  - Note: parent name registration is a manual step at sepolia.app.ens.domains

---

## Phase 2: Backend Core (Days 2-3)

- [ ] AXL client module
  - Acceptance: send(peerId, message), recv(), getTopology() all work against running AXL instances
  - Acceptance: handles 204 (no messages) from recv without throwing

- [ ] Agent manager
  - Acceptance: spawnAgent(specialty) starts an AXL process on the right port with the right key
  - Acceptance: broadcastToMesh(message) sends to all four peer IDs
  - Acceptance: 30-second timeout on agent responses; degraded mode if fewer than 4 respond

- [ ] ENS resolver service
  - Acceptance: registerAgent(name, peerId, capabilities) writes ENSIP-25 text records
  - Acceptance: discoverAgents(parentName) returns all registered agents under agentmesh.eth
  - Acceptance: verifyAgent(address, challenge) validates ENSIP-26 signature

- [ ] 0G Compute client
  - Acceptance: analyzeContract(source, specialty) returns structured finding objects
  - Acceptance: system prompts tuned per specialty; reentrancy prompt reliably finds reentrancy in
    the test vulnerable contract

- [ ] 0G Chain client
  - Acceptance: registerAgent() on AgentRegistry, attest() on AuditAttestation both work
  - Acceptance: returned tx hashes are valid and confirmable on chainscan-galileo.0g.ai

- [ ] 0G Storage client
  - Acceptance: uploadReport(report) returns rootHash within 30 seconds on testnet
  - Acceptance: local cache fallback works if indexer is unresponsive

- [ ] Consensus engine
  - Acceptance: aggregateFindings(findings[]) produces a ConsensusResult with correct severity
  - Acceptance: 3/4 agreement on a known finding correctly produces CRITICAL in output
  - Acceptance: unit tests pass (consensus.test.ts)

---

## Phase 3: Backend API + Server (Day 4)

- [ ] POST /api/audit (start an audit, distribute via AXL, stream results via WebSocket)
- [ ] GET /api/agents (return all registered agents with ENS names and status)
- [ ] GET /api/topology (aggregate topology from all 4 AXL /topology endpoints)
- [ ] WebSocket /ws (events: agent:status, agent:message, audit:finding, audit:complete)
- [ ] GET /api/agents/tools (query each agent's MCP tools via AXL /mcp proxy)

---

## Phase 4: Frontend (Day 5)

- [ ] Topology graph (D3.js force-directed)
  - Acceptance: shows 4 nodes with ENS names, connection lines
  - Acceptance: polls /api/topology every 2s, nodes animate on status change

- [ ] Audit form and chat feed
  - Acceptance: accepts contract address or Solidity source
  - Acceptance: WebSocket chat feed shows inter-agent messages in real time as they arrive

- [ ] Report view
  - Acceptance: severity-sorted findings, evidence sections, agent voting breakdown
  - Acceptance: links to 0G Chain attestation tx and 0G Storage rootHash

- [ ] Proof page (/proof)
  - Acceptance: all 4 ENS registration links visible
  - Acceptance: ENSIP-26 verification proof per agent
  - Acceptance: contract addresses with block explorer links
  - Acceptance: sample rootHash and attestation tx from pre-seeded audit

---

## Phase 5: Integration + Polish (Day 6, check-in #2)

- [ ] seed-demo.ts (idempotent script that creates all demo prerequisites from scratch)
  - Acceptance: running it twice produces same ENS records, same contracts, no duplicate errors
  - Acceptance: pre-seeded vulnerable contract on Sepolia has known reentrancy bug

- [ ] End-to-end audit flow (paste the pre-seeded vulnerable contract, get a report with the
  expected reentrancy finding at CRITICAL severity)

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
