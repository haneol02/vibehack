FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    build-essential \
    curl git \
    && rm -rf /var/lib/apt/lists/*

# Install common global packages
RUN npm install -g pm2 serve

WORKDIR /app

# Default command - will be overridden
CMD ["node", "-e", "console.log('App runner ready')"]
