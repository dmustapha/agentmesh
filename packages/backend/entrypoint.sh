#!/bin/sh
# Generate AXL node key pairs if they don't exist
KEYS_DIR="${KEYS_DIR:-/app/keys}"
mkdir -p "$KEYS_DIR"

for i in 0 1 2 3; do
  KEY_FILE="$KEYS_DIR/agent-${i}-private.pem"
  if [ ! -f "$KEY_FILE" ]; then
    openssl genpkey -algorithm ed25519 -out "$KEY_FILE" 2>/dev/null
    echo "[entrypoint] Generated key: $KEY_FILE"
  fi
done

exec node packages/backend/dist/index.js
