import { Router } from 'express';
import { db } from '../services/db.js';
import { sessionManager } from '../services/session-manager.js';

const router = Router();

router.post('/:slug/start', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  try {
    const result = await sessionManager.create(project.id, project.slug, req.body.apiKey);
    const domain = process.env.DOMAIN || 'localhost';
    const sessionUrl = `https://${domain}/proxy/session/${project.slug}/`;
    res.json({ ...result, sessionUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:slug/stop', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  try {
    await sessionManager.stop(project.id, project.slug);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug/log', async (req, res) => {
  const log = await sessionManager.getLog(req.params.slug);
  res.json({ log });
});

router.get('/:slug', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const session = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND status = ?').get(project.id, 'running');
  res.json(session || { status: 'stopped' });
});

export default router;
