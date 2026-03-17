#!/bin/bash
set -e

SESSION_NAME="${SESSION_NAME:-vibehack}"
WORKSPACE="${WORKSPACE:-/workspace}"

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

# Start tmux session if not exists
tmux new-session -d -s "$SESSION_NAME" -c "$WORKSPACE" 2>/dev/null || true

# Set ANTHROPIC_API_KEY in tmux environment (API 키 방식)
if [ -n "$ANTHROPIC_API_KEY" ]; then
    tmux set-environment -t "$SESSION_NAME" ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
fi
# claude login 방식: ~/.claude가 마운트되어 있으면 자동으로 인증됨

# Start ttyd
exec ttyd \
    --port 7681 \
    --writable \
    tmux attach-session -t "$SESSION_NAME"
