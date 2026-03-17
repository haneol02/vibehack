import { redis, redisSub } from './redis.js';
import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const CHANNEL = 'vibehack:events';

// SSE clients map: projectId -> Set of response objects
const sseClients = new Map();

export const eventBus = {
  publish(type, data, projectId = null) {
    const event = { id: uuidv4(), type, data, projectId, timestamp: Date.now() };

    // Save to DB
    db.prepare('INSERT INTO events (project_id, type, data) VALUES (?, ?, ?)')
      .run(projectId, type, JSON.stringify(data));

    // Publish to Redis
    redis.publish(CHANNEL, JSON.stringify(event));

    return event;
  },

  addSSEClient(projectId, res) {
    if (!sseClients.has(projectId)) {
      sseClients.set(projectId, new Set());
    }
    sseClients.get(projectId).add(res);

    res.on('close', () => {
      sseClients.get(projectId)?.delete(res);
    });
  },

  getSSEClients(projectId) {
    return sseClients.get(projectId) || new Set();
  }
};

// Subscribe to Redis and forward to SSE clients
redisSub.subscribe(CHANNEL, (err) => {
  if (err) console.error('Failed to subscribe:', err);
});

redisSub.on('message', (channel, message) => {
  if (channel !== CHANNEL) return;

  try {
    const event = JSON.parse(message);
    const { projectId } = event;

    // Send to all clients for this project (or global if no projectId)
    const targets = projectId
      ? [...(sseClients.get(projectId) || []), ...(sseClients.get('*') || [])]
      : [...(sseClients.get('*') || [])];

    targets.forEach(res => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (err) {
    console.error('Event bus error:', err);
  }
});
