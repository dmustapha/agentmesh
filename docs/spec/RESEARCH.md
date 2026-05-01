# Pre-Build Research Notes

These are rough notes from before I started building. Not cleaned up, because the whole point is
that this is what I was reading and thinking about when I decided what to build and how. Probably
useful for anyone who wants to understand why the architecture looks the way it does.

---

## AXL: why I noticed it

The ETHGlobal Open Agents brief listed Gensyn as a prize sponsor, and when I looked at what Gensyn
actually shipped for the hackathon it was AXL, a P2P networking binary based on Yggdrasil that
lets processes send raw messages to each other over peer IDs. It had literally launched three or
four days before the hackathon started with no existing projects using it, no prior submissions, and
essentially no Stack Overflow for it. That combination of "brand new" plus "Gensyn is explicitly
offering a prize for this" made it the obvious transport choice, since the alternative would have been wrapping libp2p or
building something WebRTC-based, and doing that to accomplish what AXL already does natively
seemed like it would be arguing against yourself in front of the judges.

The actual AXL API is simpler than I expected: POST /send with a destination peer ID in the header,
GET /recv to poll for inbound messages, GET /topology to see the mesh state. Each binary instance
gets an ed25519 keypair and that public key becomes its peer ID, so running four instances on ports
9002-9005, one per agent, gives you a real P2P mesh without any central broker. The key question I'm
not sure about going into the build is whether cross-node messaging actually works between separate
OS processes, and I'll need to confirm this early before writing any application code.

One thing worth noting is that AXL is a Go project, so it can be cross-compiled for any target. The
`scripts/setup.sh` script handles this automatically — it detects the host platform and architecture,
runs `GOOS/GOARCH/CGO_ENABLED=0 go build` to produce the right binary, and writes it as
`node-{platform}-{arch}` in the `axl/` directory. `mesh.ts` resolves the correct binary at runtime.
The backend still runs locally during the demo because AXL mesh state and keypairs aren't suited for
stateless cloud infra, but any developer on macOS, Linux, or Windows (WSL2) can run the full stack.

---

## 0G Labs: three different things

This confused me for a while because "0G" refers to at least three distinct services: 0G Compute
(LLM inference, works like OpenAI's API but decentralized), 0G Storage (decentralized file
storage with a similar use case to IPFS or Arweave), and 0G Chain (an EVM-compatible blockchain
for smart contracts and attestations). They're all from the same team and share some infrastructure
but they're not the same thing and you use them differently.

For this project I need all three. Compute is where the actual LLM reasoning happens, so each agent
calls it to analyze the contract code for its specialty. Storage is where the final audit report
goes, and you upload a JSON blob and get back a rootHash that serves as the permanent identifier.
Chain is where the attestation contract lives, so after the report is stored a transaction writes
the rootHash and a summary of findings to an on-chain record.

The serving broker SDK handles a lot of the complexity around 0G Compute: you initialize it with a
private key and a chain RPC, it manages on-chain payment channels, and then you call it with an
OpenAI-compatible chat completions request. The testnet model is qwen-2.5-7b-instruct, which is a
7B parameter model and probably not going to give you the depth of analysis a larger model would,
but it's enough to demonstrate the concept convincingly with the right system prompts.

The storage SDK is @0gfoundation/0g-ts-sdk and the chain ID for testnet is 16602. Storage uploads
go through an "indexer" node that coordinates with storage nodes; the testnet indexer is at
indexer-testnet.0g.ai. Faucet is at faucet.0g.ai. One thing I still don't have a clear answer on
is how quickly the faucet allocation drains with repeated inference calls, since the documentation
doesn't give concrete per-call cost figures, so I've been budgeting conservatively at around 5
tokens per full audit run and hoping that's enough for the demo session without needing to top up
mid-recording.

---

## ENS: why subnames and not a custom registry

The initial thought was to build a custom on-chain registry for agent identity, probably just a
mapping from address to capability metadata. ENS subnames solve this better for two reasons that build on each other: human-readable names
matter for the demo because seeing "reentrancy.agentmesh.eth" in a
topology graph is immediately understandable in a way that a hex address isn't, and ENS is an
ETHGlobal prize track so using it natively qualifies for additional prize consideration that a
custom registry wouldn't.

ENSIP-25 is the standard for agent registration via ENS text records. You set text records under
a parent name (agentmesh.eth in this case) for each agent, encoding capability and peer ID
information. ENSIP-26 extends this with a verification scheme where the agent proves it controls
the ENS name by signing a challenge with its private key and storing the signature as another text
record, so together an agent's identity, capabilities, and ownership proof are all resolvable from
ENS without needing a separate verification system.

The parent name agentmesh.eth needs to be registered on Sepolia and funded with enough ETH to
cover registration and text record set transactions. Rough estimate: 0.2-0.3 ETH should cover
everything.

---

## Four agents: why that number and those specializations

The core question with multi-agent systems is whether parallel specialization actually produces
better results than running one general-purpose model multiple times. My reasoning is that smart
contract vulnerabilities have pretty distinct pattern signatures, so a model primed specifically for
reentrancy (which is fundamentally about execution order and state changes during external calls)
will catch more than a generalist working through a comprehensive prompt. The same logic applies to
access control (missing onlyOwner, missing role checks, privilege escalation paths), logic bugs
(integer overflow/underflow, incorrect calculations, off-by-one), and economic exploits (flash
loans, sandwich attacks, price oracle manipulation). The specialization also gives the consensus
mechanism something meaningful to weigh, since you can credibly say that ReentrancyAgent's verdict
on a reentrancy finding carries more authority than EconomicAgent's.

Four is probably the right number for a demo: enough to show real parallelism and a genuine
consensus process, not so many that the architecture diagram becomes unreadable or the AXL topology
graph is confusing. I considered three by dropping economic exploits but the flash loan and oracle
manipulation category is too important to the current DeFi exploit landscape to leave out.
