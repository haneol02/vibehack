#!/bin/bash
set -e

SESSION_NAME="${SESSION_NAME:-vibehack}"
WORKSPACE="${WORKSPACE:-/workspace}"

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

# Start tmux session if not exists
tmux new-session -d -s "$SESSION_NAME" -c "$WORKSPACE" 2>/dev/null || true

# Set ANTHROPIC_API_KEY in tmux environment
if [ -n "$ANTHROPIC_API_KEY" ]; then
    tmux set-environment -t "$SESSION_NAME" ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
fi

# Start ttyd
exec ttyd \
    --port 7681 \
    --writable \
    --credential "${TTYD_USER:-user}:${TTYD_PASS:-hackathon}" \
    tmux attach-session -t "$SESSION_NAME"
