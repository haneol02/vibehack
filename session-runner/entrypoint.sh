#!/bin/bash
set -e

SESSION_NAME="${SESSION_NAME:-vibehack}"
WORKSPACE="${WORKSPACE:-/workspace}"

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

# Start tmux session if not exists
if tmux new-session -d -s "$SESSION_NAME" -u -c "$WORKSPACE" 2>/dev/null; then
  # New session - auto start claude
  sleep 1
  tmux send-keys -t "$SESSION_NAME" "claude" Enter
fi

# Set ANTHROPIC_API_KEY in tmux environment (API 키 방식)
if [ -n "$ANTHROPIC_API_KEY" ]; then
    tmux set-environment -t "$SESSION_NAME" ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
fi
# claude login 방식: ~/.claude가 마운트되어 있으면 자동으로 인증됨

# Start ttyd - each connection gets its own linked session (session group)
# so multiple users share content but have independent terminal sizes
exec ttyd \
    --port 7681 \
    --writable \
    -t rendererType=canvas \
    -t fontSize=14 \
    bash -c 'LINKED=$(tmux new-session -d -t "$SESSION_NAME" -P -F "#{session_name}") && tmux attach-session -t "$LINKED"; tmux kill-session -t "$LINKED" 2>/dev/null'
