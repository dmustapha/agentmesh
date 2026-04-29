# AI Assistance Attribution

This document is required by ETHGlobal's spec-driven disclosure rules. The short version is that
I directed the build and Claude Code wrote the code, and the planning artifacts in docs/spec/ exist
to show how the architecture was designed before implementation began.

---

## Architectural Decisions Made Before Any Code Existed

These decisions are mine rather than the AI's, because they depend on context that isn't in any
codebase: what the hackathon sponsors were actually offering, which prize tracks were available,
what was technically feasible given the constraints, and what would be interesting enough to build
and demo convincingly.

Gensyn launched AXL four days before the hackathon opened, which created a fairly specific
opportunity since there were zero existing ETHGlobal submissions built on it and the prize track was
explicitly rewarding deep integration with the binary. Wrapping libp2p or using WebRTC would have
produced something technically similar but would have made a much weaker case for the Gensyn prize,
since those approaches don't give you the "we actually used the thing they shipped" argument. I also
needed to confirm AXL actually worked before committing to it, so I tested cross-node message
delivery between two instances before writing any application code.

I chose to use all three 0G services (Compute, Storage, and Chain) because they serve genuinely
different purposes in the pipeline and using all three makes a stronger case for the integration
than picking one and treating the rest as decorative. Compute handles the LLM reasoning inside each
agent, Storage handles report persistence with verifiable rootHashes, and Chain is where the
attestation contracts live, so the distinction matters to judges evaluating whether the integrations
are actually load-bearing or just mentioned in the README.

Agent identity needed to be human-readable for the demo because hex addresses on a topology graph
communicate nothing to someone watching a four-minute recording, and ENS is a prize track so using
it qualifies for additional consideration that a custom registry contract wouldn't. ENSIP-25 is a
recent standard for AI agent registration via ENS text records, and implementing it is probably one
of the first real uses of the standard in a working project, which felt like a genuine originality
argument rather than a made-up one. I added ENSIP-26 on top of that because it proves the agent
actually controls the ENS name rather than just having had metadata written there by someone else,
and the additional code was small enough that skipping it would have been a strange decision.

The decision to run four specialized agents rather than one general-purpose model came from thinking
through how vulnerability analysis actually works: reentrancy patterns, access control bugs, logic
errors, and economic exploits have different signatures and benefit from different starting
assumptions, so a model primed specifically for reentrancy will catch things a generalist is less
likely to notice while focused on something else. That specialization also gives the consensus
mechanism something meaningful to work with, since you can honestly say one agent's verdict carries
more weight on its own finding category than another's does.

The /proof page as a separate route came from realizing that judges who want to verify integrations
and users who want to submit contracts are doing completely different things, and mixing verifiable
proof artifacts into the main dashboard would get in the way of the primary flow. A dedicated route
lets the proof page be as technical and dense as it needs to be without affecting the experience for
someone who just wants to paste a contract address and see what comes back.

Requiring a wallet connection to view the mesh topology would have cut off most people who tried the
demo, since the topology graph and the pre-seeded audit history are exactly what you want someone to
see the moment they open the URL. The only thing required to submit your own contract is having a
contract address, which felt like the right amount of friction for a tool aimed at developers.

---

## Development Tooling

Claude Code was used as the primary coding assistant throughout this project, in the same way that
GitHub Copilot or Cursor would be used on a non-hackathon project. The components that involved
AI-assisted code generation:

- Backend services: AXL client, agent manager, ENS resolver, 0G Compute client, 0G Storage client,
  0G Chain client, consensus engine, Express API routes, WebSocket server
- Frontend components: topology graph (D3.js), audit console, chat feed, report view, proof page
- Smart contracts: AgentRegistry.sol, AuditAttestation.sol (Foundry)
- Test files: agent consensus tests, API route tests, frontend component tests
- Utility scripts: generate-keys.sh, start-mesh.sh, seed-demo.ts

I reviewed and iterated on all of the generated code. The planning work above had to come first
because the implementation only makes sense once you know what you're building and why, and those
decisions about which APIs to use, which standards to implement, and how the agents should talk to
each other weren't things that came out of the code generation process.

---

## Spec Artifacts

The documents in docs/spec/ predate the implementation and show how the build was directed:

- docs/spec/RESEARCH.md: pre-build notes on AXL, 0G, and ENS written before coding started
- docs/spec/ARCHITECTURE.md: ADR-format decision records for the five major architectural choices
- docs/spec/PRD.md: product requirements with decision log and open questions as of project start
- docs/spec/PLAN.md: task breakdown with acceptance criteria, updated as work progressed

These documents exist for the purpose of ETHGlobal's spec-driven disclosure requirement: show how
the AI was directed, not just what it produced.

---

## Post-Scaffold Iteration

The work from April 26 onward represents genuine daily refinement rather than staged re-commits of
pre-existing code:

- April 26: docs/spec/ folder created, this attribution document written
- April 27: ENS subname registration (real on-chain transactions), design implementation in Next.js
- April 28: AXL cross-node test (two live instances, message delivery confirmed), GENSYN.md
- April 29: 0G Storage integration completed (was stubbed during initial build), 0G.md
- April 30: Storage hash verification added to AuditAttestation contract
- May 1: End-to-end integration testing, P2P message feed in ChatFeed component, architecture diagram
- May 2: Demo video recorded, deployment guide written
- May 3: Final submission
