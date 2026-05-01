#!/usr/bin/env bash
# AgentMesh setup — works on macOS (Intel + Apple Silicon), Linux (x86_64 + arm64), Windows WSL2
set -euo pipefail

PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AXL_DIR="$REPO_ROOT/axl"

echo "=== AgentMesh Setup ==="
echo "Platform: $PLATFORM/$ARCH"
echo "Root: $REPO_ROOT"

# ── 1. Resolve or build AXL binary ──────────────────────────────────────────
resolve_axl_binary() {
  case "$PLATFORM" in
    darwin)
      case "$ARCH" in
        arm64)  BINARY="$AXL_DIR/node-darwin-arm64"  ;;
        x86_64) BINARY="$AXL_DIR/node-darwin-amd64"  ;;
      esac ;;
    linux)
      case "$ARCH" in
        x86_64|amd64) BINARY="$AXL_DIR/node-linux-amd64"  ;;
        aarch64|arm64) BINARY="$AXL_DIR/node-linux-arm64" ;;
      esac ;;
    msys*|cygwin*|mingw*)
      BINARY="$AXL_DIR/node-windows-amd64.exe" ;;
  esac

  if [ -f "$BINARY" ]; then
    echo "[AXL] Pre-built binary found: $BINARY"
    chmod +x "$BINARY"
    return 0
  fi

  echo "[AXL] No pre-built binary for $PLATFORM/$ARCH — building from source..."
  if ! command -v go &>/dev/null; then
    echo "ERROR: Go 1.25+ is required to build AXL. Install from https://go.dev/dl/"
    echo "  Or use Docker: docker compose up --build"
    exit 1
  fi
  cd "$AXL_DIR"
  GOTOOLCHAIN=go1.25.5 go build -o "$BINARY" ./cmd/node/
  chmod +x "$BINARY"
  echo "[AXL] Built: $BINARY"
}

resolve_axl_binary

# ── 2. Generate node keys ────────────────────────────────────────────────────
KEYS_DIR="$REPO_ROOT/keys"
mkdir -p "$KEYS_DIR"

for PORT in 9002 9003 9004 9005; do
  KEY_FILE="$KEYS_DIR/node-$PORT.pem"
  if [ ! -f "$KEY_FILE" ]; then
    if command -v openssl &>/dev/null; then
      openssl genpkey -algorithm ed25519 -out "$KEY_FILE" 2>/dev/null
      echo "[Keys] Generated $KEY_FILE"
    else
      echo "WARNING: openssl not found — AXL nodes will generate ephemeral keys at startup"
    fi
  fi
done

# ── 3. Write node configs ───────────────────────────────────────────────────
write_config() {
  local PORT="$1" PEERS="$2"
  cat > "$KEYS_DIR/node-config-$PORT.json" << CONFIG
{
  "PrivateKeyPath": "$KEYS_DIR/node-$PORT.pem",
  "Peers": $PEERS,
  "Listen": ["tls://0.0.0.0:$PORT"],
  "AdminListen": "tcp://127.0.0.1:1$PORT"
}
CONFIG
}

write_config 9002 "[]"
write_config 9003 '["tls://127.0.0.1:9002"]'
write_config 9004 '["tls://127.0.0.1:9002"]'
write_config 9005 '["tls://127.0.0.1:9002"]'
echo "[Config] Node configs written to $KEYS_DIR"

# ── 4. .env check ───────────────────────────────────────────────────────────
if [ ! -f "$REPO_ROOT/.env" ]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  echo "[Env] .env created from .env.example — fill in PRIVATE_KEY for on-chain features"
fi

# ── 5. Install JS deps ──────────────────────────────────────────────────────
cd "$REPO_ROOT"
if command -v pnpm &>/dev/null; then
  pnpm install
elif command -v npm &>/dev/null; then
  npm install -g pnpm && pnpm install
else
  echo "ERROR: Node.js / pnpm not found. Install Node 20+ from https://nodejs.org"
  exit 1
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Start the backend:  cd packages/backend && pnpm dev"
echo "Start the frontend: cd packages/frontend && pnpm dev"
echo ""
echo "Or use Docker:      docker compose up --build"
