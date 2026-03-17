FROM node:22-slim

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ ./src/

ENV DASHBOARD_API_URL=http://dashboard:3001

CMD ["node", "src/index.js"]
