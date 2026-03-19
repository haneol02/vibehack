import { Router } from 'express';
import { db } from '../services/db.js';
import { sessionManager } from '../services/session-manager.js';
import { claudeRunner } from '../services/claude-runner.js';

const router = Router();

router.post('/:slug/start', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const session = sessionManager.create(project.id, project.slug);
  res.json(session);
});

router.post('/:slug/stop', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  sessionManager.stop(project.id, project.slug);
  res.json({ ok: true });
});

router.post('/:slug/chat', async (req, res) => {
  const { message, username, source, model } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  if (claudeRunner.isRunning(req.params.slug)) {
    return res.status(409).json({ error: 'Claude가 이미 실행 중입니다' });
  }

  // Run async - client listens via SSE
  claudeRunner.run(project.slug, project.id, message, username || '사용자', source || 'web', model || null)
    .catch(err => console.error('Claude run error:', err));

  res.json({ ok: true });
});

// Synchronous endpoint for Discord bot (waits for Claude to finish)
router.post('/:slug/chat/sync', async (req, res) => {
  const { message, username } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  if (claudeRunner.isRunning(req.params.slug)) {
    return res.status(409).json({ error: 'Claude가 이미 실행 중입니다' });
  }

  try {
    const result = await claudeRunner.run(project.slug, project.id, message, username || 'Discord', 'discord');
    res.json({ reply: result.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug/messages', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const messages = claudeRunner.getMessages(project.id);
  res.json(messages);
});

router.get('/:slug', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const session = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND status = ?').get(project.id, 'running');
  res.json({
    ...(session || { status: 'stopped' }),
    claudeRunning: claudeRunner.isRunning(req.params.slug),
  });
});

export default router;
