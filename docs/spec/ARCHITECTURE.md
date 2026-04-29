# AgentMesh: Architecture Decision Records

This document covers the major architectural decisions made before and during the build. ADR format
because a flat architecture doc mostly just describes the code that already exists, while the
decisions and the reasoning behind them can only be written by the person who made them.

---

## ADR-001: P2P Transport

The agents need to communicate with each other without going through a central server, and there
were three realistic options: libp2p (battle-tested but you're writing your own abstraction layer),
WebRTC (built for browsers and overkill for backend-to-backend), or Gensyn's AXL binary which had
launched literally days before the hackathon opened.

I went with AXL primarily because Gensyn is an explicit prize sponsor and using their actual binary
rather than wrapping a generic P2P library seemed like it would make a much stronger case for the
integration, since you can demonstrate that AXL is genuinely load-bearing in a way that's hard to
argue with: removing it means the agents have no way to communicate. Beyond the strategic angle,
AXL's HTTP API turned out to be simpler than I expected: POST /send with the destination peer ID
in a header, GET /recv to poll for inbound messages, and GET /topology to see the mesh state. Four
binary instances on ports 9002-9005, each with its own ed25519 keypair, form a real Yggdrasil
overlay mesh without needing a DHT bootstrap server since all instances are on localhost and the
topology is small enough that static peer wiring works fine.

libp2p would have given more control and probably better reliability, but it's considerably more
code to get right and the result would be indistinguishable from any other "we used libp2p" project.
A WebSocket relay server was briefly considered as a fallback if AXL proved unstable and it's still
in the codebase as the degraded mode, but AXL worked reliably enough in testing that the fallback
stayed dormant.

One constraint that came up during implementation: the AXL binary is Mach-O arm64, which means it
won't run on Linux without cross-compilation or QEMU, so the backend has to run locally rather than
on a cloud host. The frontend is deployed on Vercel and connects to the locally-running backend
during the demo recording, which is a somewhat awkward setup but not unusual for a hackathon demo
with hardware dependencies.

It's also worth noting that AXL is genuinely new software with no production track record, limited
documentation, and essentially one maintainer, which is a real risk. The upside is there's also no
competition, since zero existing ETHGlobal submissions had built on AXL before this one.

---

## ADR-002: Attestation Storage

Audit reports need to be stored somewhere permanent and there needs to be an on-chain record proving
that a specific contract was audited with specific findings. The alternatives were IPFS (common but
not prize-eligible for this hackathon), Arweave (permanent but expensive and with no hackathon
incentive to use it), or 0G's own storage and chain infrastructure.

I went with 0G Storage for the report files and 0G Chain for the attestation records, partly because
0G Labs is a prize sponsor but also because the architecture actually fits better than the
alternatives. 0G Storage handles the report blob and returns a rootHash, and then that rootHash gets
written to the AuditAttestation contract on 0G Chain (chain ID 16602), so judges can independently
verify both: the report is downloadable via rootHash from the 0G storage indexer, and the
attestation record on-chain shows which contract was audited, when, and what the consensus severity
breakdown was. That's more verifiable than IPFS (where pinning uncertainty is a real concern) and
more accessible than Arweave (where the retrieval tooling is less standardized).

The obvious concern with 0G's testnet is reliability: if the indexer is down or the faucet has
run dry, the storage step fails. There's a local cache fallback that saves report JSON to disk if
the upload fails, and the attestation can still be written with the local hash, so the pipeline
degrades gracefully rather than blocking completely. The @0gfoundation/0g-ts-sdk documentation is
fairly thin and took some time to work through; the serving broker SDK for 0G Compute handles
payment channel management on-chain automatically, which is convenient but requires an account with
testnet tokens before any inference calls will work. Faucet rate limits are still not fully
documented so I budgeted conservatively at 5 tokens per full demo run.

---

## ADR-003: Agent Identity

Agents need identities that are human-readable (for the demo and topology graph), machine-resolvable
so agents can discover each other without a hardcoded peer ID list, and verifiable so judges can
confirm the integration is real. The obvious options were a custom on-chain registry contract, ENS
subnames, or just hardcoding peer IDs.

I went with ENS subnames on Sepolia, using ENSIP-25 text records for capability metadata and
ENSIP-26 for ownership verification, for a few reasons that build on each other. Human-readable
names matter a lot for the demo, because "reentrancy.agentmesh.eth" on a topology graph node
communicates the agent's role immediately in a way that a hex address simply doesn't. ENS is also
an ETHGlobal prize track, so using it natively qualifies for prize consideration that a custom
registry wouldn't. And ENSIP-25 and ENSIP-26 are new standards specifically designed for AI agent
registration and verification, which means implementing both is probably one of the first real uses
of either in a working project, and that matters for the originality case to judges.

The setup is that the parent name agentmesh.eth gets registered on Sepolia, and then four subnames
are created under it: reentrancy.agentmesh.eth, access.agentmesh.eth, logic.agentmesh.eth, and
economic.agentmesh.eth. ENSIP-25 defines how agent capability metadata gets encoded as text records.
ENSIP-26 extends this with an ownership verification scheme where the agent signs a challenge with
its private key and stores the signature as a text record, proving it controls the ENS name without
needing a separate proof system.

A custom registry contract on 0G Chain would have been faster to build but would have missed both
the ENS prize track and the "first ENSIP-25 implementation" argument. Hardcoding peer IDs would
have worked functionally for the demo but can't be presented as a genuine agent discovery mechanism
and wouldn't satisfy the integration requirements.

One thing that was unclear before testing: ENSIP-25 text record keys follow a specific naming
convention (`agent-registration[<registry_addr>][<agentId>]`), and I wasn't sure whether the
standard ENS PublicResolver on Sepolia would support that key format or whether we'd need a custom
resolver. It turned out the PublicResolver supports arbitrary text record keys, so ENSIP-25 is
essentially just a naming convention layered on top of what the standard resolver already handles.
Registration and text record set transactions ran roughly 0.2-0.3 ETH on Sepolia.

---

## ADR-004: Consensus Design

The core question with a multi-agent architecture is whether running four specialized agents in
parallel actually produces better security analysis than running one general-purpose model with a
comprehensive prompt, because if it doesn't then the whole multi-agent setup is complexity for its
own sake.

I went with four parallel specialized agents and weighted consensus voting primarily because smart
contract vulnerability classes have genuinely different signatures and benefit from different
starting assumptions about what to look for. Reentrancy is fundamentally about execution order and
state mutation during external calls, and a model primed specifically for that class of bug will
surface things a generalist is likely to miss while focused on something else, and the same logic
applies to access control (missing privilege checks, privilege escalation paths), logic bugs
(arithmetic errors, off-by-one, invariant violations), and economic exploits (flash loans, oracle
manipulation, MEV vectors). The specialization also gives the consensus mechanism something
meaningful to weight, so you can say that ReentrancyAgent's verdict on a reentrancy finding carries
more authority than EconomicAgent's, which is a coherent claim rather than an arbitrary one.

The consensus algorithm itself is straightforward: each agent votes on each finding with a
confidence score weighted by specialty relevance, a finding makes it into the final report if at
least 2 of 4 agents agree or if 1 agent reports CRITICAL confidence above 0.9, and the max severity
from the agreeing agents wins. Running a single LLM call with a comprehensive prompt would have been
faster but can't demonstrate parallelism over AXL, which is exactly what judges are evaluating. A
sequential chain where each agent reads the previous one's output would produce more coherent
reasoning but runs slower and makes the AXL mesh topology less interesting since the agents would
essentially be waiting in a queue.

Four turned out to be the right number: enough to show real parallelism and a genuine consensus
process, readable enough on a topology graph (four nodes, six connection lines), and complete enough
that the four categories (reentrancy, access control, logic, economic) cover the major DeFi
vulnerability classes without leaving obvious gaps. I considered three by dropping economic exploits
but flash loans and oracle manipulation represent too large a share of actual DeFi losses to leave
out.

---

## ADR-005: Smart Contract Scope

The on-chain component needed to be substantial enough to demonstrate real smart contract integration
but scoped tightly enough to actually deploy and test within the hackathon timeline.

I landed on two contracts on 0G Chain: AgentRegistry for agent identity records and AuditAttestation
for audit proof records, with everything else staying off-chain. AgentRegistry stores agent name,
capability string, and AXL peer ID for each registered agent address; AuditAttestation stores the
audited contract address, findings hash (keccak256 of the full report), 0G Storage rootHash, and
severity breakdown counts per attestation. Both are intentionally minimal: verifiable enough for
judges to confirm the integrations are real, but not complex enough to introduce deployment risk or
unexpected gas costs on a testnet.

Putting AgentRegistry on 0G Chain rather than relying entirely on ENS for identity was about
creating a second proof layer that operates independently. ENS records prove the agent has a name
and claimed capabilities, but the on-chain registry proves the agent's owner address committed that
information to a specific chain at a specific block, and together those two things are more
convincing than either one alone.

The actual audit findings, agent reasoning transcripts, and consensus scoring details stay off-chain
and go to 0G Storage referenced by rootHash, since putting large blobs on-chain would be expensive
and unnecessary when 0G Storage is literally built for this purpose. The overall scope was
deliberately narrow, since the goal was to prove the concept convincingly rather than build something
that competes with Trail of Bits, so ZK proofs, formal verification, and multi-chain support all
stayed out of scope.

---

## Known Constraints and Open Items

The AXL binary is Mach-O arm64 only, so the backend is local-only for the demo, and judges who
want to run the full stack themselves will need Apple Silicon, which is documented in the README
and the demo video covers the full flow for judges who don't want to run it locally.

The available model on 0G Compute testnet is qwen-2.5-7b-instruct, which is a 7B parameter model
and produces analysis quality that reflects that scale, so the system prompts are crafted to guide
it toward specific vulnerability patterns rather than relying on general security knowledge that a
larger model might have internalized more deeply.

The agentmesh.eth ENS registration is a manual one-time step at sepolia.app.ens.domains and can't
be automated from within the project, so it has to be done before any of the ENS-dependent code
can be tested, and the registration tx hash is included in the proof page as evidence that it
happened.

Four AXL instances running on different ports on the same machine form a real Yggdrasil mesh, and
cross-node routing was tested and confirmed before any application code was written: messages route
through the Yggdrasil overlay rather than localhost loopback, and the topology endpoint shows each
peer's Yggdrasil IPv6 address as evidence.

Testnet infrastructure can be unreliable, so the audit pipeline degrades gracefully at every
integration point: if the storage upload fails the report is cached locally, and if the attestation
fails the audit still completes with a warning. The demo recording uses a pre-confirmed session
to avoid live testnet failures showing up on camera.
