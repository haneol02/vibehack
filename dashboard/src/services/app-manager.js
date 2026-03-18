import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { db } from './db.js';
import { eventBus } from './event-bus.js';
import { v4 as uuidv4 } from 'uuid';

function findProjectRoot(dir) {
  // If package.json exists at root, use root
  if (existsSync(join(dir, 'package.json'))) return dir;
  // Otherwise check one level deep
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && existsSync(join(dir, entry.name, 'package.json'))) {
        return join(dir, entry.name);
      }
    }
  } catch {}
  return dir;
}

const APP_BASE_PORT = 8100;
const MAX_APPS = 20;

// pid → child process reference
const processes = new Map();

function getNextAppPort(usedPorts) {
  for (let p = APP_BASE_PORT; p < APP_BASE_PORT + MAX_APPS; p++) {
    if (!usedPorts.includes(p)) return p;
  }
  throw new Error('No available app ports');
}

export const appManager = {
  async start(projectId, projectSlug, startCommand = 'npm start', appPort = 3000) {
    const apps = db.prepare('SELECT port FROM apps WHERE status = ?').all('running');
    const usedPorts = apps.map(a => a.port);
    const port = getNextAppPort(usedPorts);

    // Kill existing process for this slug if any
    const existing = db.prepare('SELECT * FROM apps WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (existing) {
      try {
        const proc = processes.get(Number(existing.container_id));
        if (proc) proc.kill();
        processes.delete(Number(existing.container_id));
      } catch {}
      db.prepare('UPDATE apps SET status = ? WHERE id = ?').run('stopped', existing.id);
    }

    const projectRoot = findProjectRoot(`/projects/${projectSlug}`);

    // Auto-detect start command if using default 'npm start' but project lacks it
    if (startCommand === 'npm start') {
      try {
        const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
        const scripts = pkg.scripts || {};
        if (!scripts.start) {
          if (scripts.dev) startCommand = 'npm run dev -- --port $PORT';
          else if (scripts.preview) startCommand = 'npm run preview -- --port $PORT';
        }
      } catch {}
    }

    const proc = spawn('/bin/sh', ['-c', startCommand], {
      cwd: projectRoot,
      env: { ...process.env, PORT: String(port) },
      detached: false,
    });

    processes.set(proc.pid, proc);

    proc.on('exit', () => {
      processes.delete(proc.pid);
      db.prepare('UPDATE apps SET status = ? WHERE container_id = ?').run('stopped', String(proc.pid));
      eventBus.publish('app.stopped', { projectSlug }, projectId);
    });

    const appId = uuidv4();
    const subdomain = projectSlug;

    db.prepare('DELETE FROM apps WHERE subdomain = ?').run(subdomain);
    db.prepare(`
      INSERT INTO apps (id, project_id, container_id, container_name, port, app_port, subdomain, status, start_command)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?)
    `).run(appId, projectId, String(proc.pid), `app-${projectSlug}`, port, port, subdomain, startCommand);

    const domain = process.env.DOMAIN || 'localhost';
    const url = `https://${subdomain}.${domain}`;

    eventBus.publish('app.started', { projectSlug, subdomain, url, port }, projectId);

    return { appId, port, subdomain, url, status: 'running' };
  },

  async stop(projectId, projectSlug) {
    const app = db.prepare('SELECT * FROM apps WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (!app) return null;

    try {
      const proc = processes.get(Number(app.container_id));
      if (proc) proc.kill();
      processes.delete(Number(app.container_id));
    } catch {}

    db.prepare('UPDATE apps SET status = ? WHERE id = ?').run('stopped', app.id);
    eventBus.publish('app.stopped', { projectSlug }, projectId);

    return app;
  }
};
