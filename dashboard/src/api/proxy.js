import { Router } from 'express';
import httpProxy from 'http-proxy';
import { db } from '../services/db.js';

const router = Router();
const proxy = httpProxy.createProxyServer({});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Session unavailable' }));
});

// Proxy session ttyd connections
router.use('/session/:slug', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'not found' });

  const session = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND status = ?').get(project.id, 'running');
  if (!session) return res.status(404).json({ error: 'no active session' });

  // Rewrite path
  req.url = req.url.replace(`/session/${req.params.slug}`, '') || '/';

  proxy.web(req, res, { target: `http://${session.container_name}:7681` });
});

// Proxy app subdomain requests (nginx wildcard sends /proxy/app/:slug)
router.use('/app/:slug', (req, res) => {
  const slug = req.params.slug;
  const appRow = db.prepare('SELECT * FROM apps WHERE subdomain = ? AND status = ?').get(slug, 'running');
  if (!appRow) return res.status(503).send(`<h1>App "${slug}" is not running</h1>`);

  req.url = req.url.replace(`/proxy/app/${slug}`, '') || '/';
  proxy.web(req, res, { target: `http://${appRow.container_name}:${appRow.app_port}` });
});

export { proxy };
export default router;
