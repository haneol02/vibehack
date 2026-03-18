import { Router } from 'express';
import { db } from '../services/db.js';
import { eventBus } from '../services/event-bus.js';

const router = Router();

// SSE endpoint for real-time events
router.get('/stream', (req, res) => {
  const projectId = req.query.projectId || '*';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send recent events
  const recent = db.prepare(`
    SELECT * FROM events
    WHERE (project_id = ? OR ? = '*')
    ORDER BY created_at DESC LIMIT 50
  `).all(projectId, projectId);

  recent.reverse().forEach(evt => {
    res.write(`data: ${JSON.stringify({ ...evt, data: JSON.parse(evt.data || '{}') })}\n\n`);
  });

  eventBus.addSSEClient(projectId, res);

  // Keep alive - send actual data event so Cloudflare doesn't 524
  const keepAlive = setInterval(() => res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`), 25000);
  req.on('close', () => clearInterval(keepAlive));
});

// Post event from Discord bot
router.post('/', (req, res) => {
  const { type, data, projectId } = req.body;
  const event = eventBus.publish(type, data, projectId);
  res.json(event);
});

// Get recent events
router.get('/', (req, res) => {
  const { projectId, limit = 50 } = req.query;
  const events = db.prepare(`
    SELECT * FROM events
    WHERE (project_id = ? OR ? IS NULL)
    ORDER BY created_at DESC LIMIT ?
  `).all(projectId, projectId, Number(limit));
  res.json(events.reverse());
});

export default router;
