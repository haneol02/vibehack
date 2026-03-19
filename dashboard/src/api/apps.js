import { Router } from 'express';
import { db } from '../services/db.js';
import { appManager } from '../services/app-manager.js';

const router = Router();

router.post('/:slug/start', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const { startCommand = 'npm start', appPort = 3000 } = req.body;

  try {
    const result = await appManager.start(project.id, project.slug, startCommand, appPort);
    res.json(result);
  } catch (err) {
    console.error('[apps] start error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:slug/stop', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  try {
    await appManager.stop(project.id, project.slug);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug/logs', (req, res) => {
  res.json(appManager.getLogs(req.params.slug));
});

router.get('/:slug', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const app = db.prepare('SELECT * FROM apps WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(project.id);
  res.json(app || { status: 'stopped' });
});

export default router;
