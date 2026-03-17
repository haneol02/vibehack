FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl wget git tmux vim nano \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install ttyd from release
RUN wget -q -O /usr/local/bin/ttyd \
    "https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64" \
    && chmod +x /usr/local/bin/ttyd

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /workspace

EXPOSE 7681

ENTRYPOINT ["/entrypoint.sh"]
