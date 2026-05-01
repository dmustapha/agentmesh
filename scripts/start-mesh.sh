#!/usr/bin/env bash
# Start all 4 AXL mesh nodes. Run this before starting the backend.
set -euo pipefail

PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AXL_DIR="$REPO_ROOT/axl"
KEYS_DIR="$REPO_ROOT/keys"
PIDS_FILE="$REPO_ROOT/.mesh-pids"

resolve_binary() {
  case "$PLATFORM/$ARCH" in
    darwin/arm64)    echo "$AXL_DIR/node-darwin-arm64" ;;
    darwin/x86_64)   echo "$AXL_DIR/node-darwin-amd64" ;;
    linux/x86_64)    echo "$AXL_DIR/node-linux-amd64"  ;;
    linux/aarch64)   echo "$AXL_DIR/node-linux-arm64"  ;;
    *)               echo "$AXL_DIR/node"               ;;
  esac
}

BINARY="$(resolve_binary)"

if [ ! -f "$BINARY" ]; then
  echo "ERROR: AXL binary not found at $BINARY"
  echo "Run: ./scripts/setup.sh first"
  exit 1
fi

echo "Using AXL binary: $BINARY"
> "$PIDS_FILE"

for PORT in 9002 9003 9004 9005; do
  CONFIG="$KEYS_DIR/node-config-$PORT.json"
  if [ ! -f "$CONFIG" ]; then
    echo "ERROR: Config not found: $CONFIG — run ./scripts/setup.sh first"
    exit 1
  fi
  LOG="$REPO_ROOT/logs/axl-$PORT.log"
  mkdir -p "$(dirname "$LOG")"
  "$BINARY" -config "$CONFIG" > "$LOG" 2>&1 &
  PID=$!
  echo "$PID" >> "$PIDS_FILE"
  echo "[Mesh] Node :$PORT started (PID $PID)"
done

echo "[Mesh] All nodes running. PIDs in $PIDS_FILE"
echo "[Mesh] Logs in $REPO_ROOT/logs/"
