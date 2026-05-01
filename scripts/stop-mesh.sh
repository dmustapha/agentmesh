#!/usr/bin/env bash
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS_FILE="$REPO_ROOT/.mesh-pids"

if [ ! -f "$PIDS_FILE" ]; then
  echo "No mesh PIDs file found — killing by port..."
  for PORT in 9002 9003 9004 9005; do
    PID=$(lsof -ti ":$PORT" 2>/dev/null) && [ -n "$PID" ] && kill "$PID" && echo "Killed :$PORT (PID $PID)"
  done
  exit 0
fi

while read -r PID; do
  kill "$PID" 2>/dev/null && echo "Killed PID $PID" || echo "PID $PID already gone"
done < "$PIDS_FILE"
rm -f "$PIDS_FILE"
echo "Mesh stopped."
