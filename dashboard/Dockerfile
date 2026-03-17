FROM node:22-slim AS ui-builder
WORKDIR /ui
COPY src/web/package.json .
RUN npm install
COPY src/web/ .
RUN npm run build

FROM node:22-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY src/ ./src/
COPY --from=ui-builder /ui/dist ./public
EXPOSE 3001
CMD ["node", "src/index.js"]
