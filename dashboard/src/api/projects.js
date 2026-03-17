import { Router } from 'express';
import { db } from '../services/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  const projects = db.prepare("SELECT * FROM projects WHERE status != 'archived' ORDER BY created_at DESC").all();
  res.json(projects);
});

router.post('/', (req, res) => {
  const { name, description, discordChannelId, createdBy } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = uuidv4();
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);

  try {
    db.prepare(`
      INSERT INTO projects (id, slug, name, description, discord_channel_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, slug, name, description, discordChannelId, createdBy);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(project);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'slug already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'not found' });
  res.json(project);
});

router.delete('/:slug', (req, res) => {
  db.prepare('UPDATE projects SET status = ? WHERE slug = ?').run('archived', req.params.slug);
  res.json({ ok: true });
});

export default router;
