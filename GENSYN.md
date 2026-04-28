# Gensyn AXL Integration

AXL is Gensyn's P2P networking binary. It runs a Yggdrasil overlay mesh where each instance gets
an ed25519 keypair, and the public key becomes the peer ID used for addressing. You POST to /send
with a destination peer ID header, GET from /recv to poll inbound messages, and GET /topology to
see the mesh state.

---

## Running multiple instances

Each instance needs its own port and key file. Four agents means four processes:

```bash
./axl/node --port 9002 --key-file keys/agent0.pem &
./axl/node --port 9003 --key-file keys/agent1.pem &
./axl/node --port 9004 --key-file keys/agent2.pem &
./axl/node --port 9005 --key-file keys/agent3.pem &
```

Each gets a distinct peer ID visible at GET /topology under `our_public_key`. That peer ID is what
you use as the destination header when sending a message.

---

## Cross-node routing confirmed

The critical thing I needed to verify before building the application layer was whether POST /send
actually routes through the Yggdrasil overlay between separate OS processes, or just sends over
localhost loopback. If it was just loopback the "P2P mesh" claim would be hollow.

Tested two instances on ports 9002 and 9003:

```bash
# Get peer ID of node on 9003
PEER_ID=$(curl -s http://localhost:9003/topology | jq -r '.our_public_key')

# Send from 9002 to 9003
curl -X POST http://localhost:9002/send \
  -H "X-Destination: $PEER_ID" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","payload":"cross-node check"}'

# Poll 9003 for the message
curl http://localhost:9003/recv
```

The message appears on 9003's recv endpoint. The topology endpoint shows each peer's Yggdrasil
IPv6 address (format: `200::/7` range), confirming overlay routing rather than loopback. This is
what we needed — the mesh is real, not simulated.

---

## Key generation

Each agent needs a PEM key file before first run. The `scripts/generate-keys.sh` script handles
this:

```bash
bash scripts/generate-keys.sh
```

This creates `keys/agent0.pem` through `keys/agent3.pem`. Keys are in .gitignore — don't commit
them.

---

## HTTP API reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /topology | GET | Returns mesh state including our_public_key and connected peers |
| /send | POST | Send message to peer ID (set X-Destination header) |
| /recv | GET | Poll for inbound messages (returns 204 if queue empty) |

The binary is Mach-O arm64 — it only runs on Apple Silicon. No Linux deploy for the backend;
the demo runs locally with the frontend on Vercel connecting to the local backend.

---

## In AgentMesh

Each of the four agents (reentrancy, access-control, logic, economic) runs its own AXL instance.
The orchestrator broadcasts audit requests over the mesh, agents respond with findings, and the
consensus engine aggregates. The topology graph in the frontend polls /topology every 2 seconds to
show live mesh state.
