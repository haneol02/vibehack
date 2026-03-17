import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { db } from './services/db.js';
import { eventBus } from './services/event-bus.js';
import projectsRouter from './api/projects.js';
import sessionsRouter from './api/sessions.js';
import appsRouter from './api/apps.js';
import eventsRouter from './api/events.js';
import proxyRouter, { proxy } from './api/proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/apps', appsRouter);
app.use('/api/events', eventsRouter);

// Proxy for session containers (ttyd WebSocket) and app subdomains
app.use('/proxy', proxyRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve React static files if built UI exists
const publicDir = join('/app', 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // Catch-all for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
}

// WebSocket upgrade handling for ttyd proxy
server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';
  // Route WebSocket upgrades through the proxy
  const sessionMatch = url.match(/^\/proxy\/session\/([^/]+)/);
  if (sessionMatch) {
    const slug = sessionMatch[1];
    const project = db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug);
    if (project) {
      const session = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND status = ?').get(project.id, 'running');
      if (session) {
        req.url = url.replace(`/proxy/session/${slug}`, '') || '/';
        proxy.ws(req, socket, head, { target: `http://localhost:${session.port}` });
        return;
      }
    }
  }
  socket.destroy();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Dashboard API running on port ${PORT}`);
});

export { server };
