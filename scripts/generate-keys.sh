#!/bin/bash
# File: scripts/generate-keys.sh
# Generate ed25519 key pairs for 4 AXL agent nodes

KEYS_DIR="${1:-./keys}"
mkdir -p "$KEYS_DIR"

for i in 0 1 2 3; do
  KEY_FILE="$KEYS_DIR/agent-${i}-private.pem"
  if [ -f "$KEY_FILE" ]; then
    echo "Key already exists: $KEY_FILE"
  else
    openssl genpkey -algorithm ed25519 -out "$KEY_FILE"
    echo "Generated: $KEY_FILE"
  fi
done

echo "All keys generated in $KEYS_DIR"
