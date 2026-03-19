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
// slug → log lines (circular buffer)
const appLogs = new Map();
const MAX_LOG_LINES = 500;

// On startup, reset any stale 'running' apps (orphaned from previous process)
db.prepare("UPDATE apps SET status = 'stopped' WHERE status = 'running'").run();

function getNextAppPort(usedPorts) {
  for (let p = APP_BASE_PORT; p < APP_BASE_PORT + MAX_APPS; p++) {
    if (!usedPorts.includes(p)) return p;
  }
  throw new Error('No available app ports');
}

function killProcessGroup(pid) {
  try { process.kill(-pid, 'SIGKILL'); } catch {}
  try { process.kill(pid, 'SIGKILL'); } catch {}
}

export const appManager = {
  async start(projectId, projectSlug, startCommand = 'npm start', appPort = 3000) {
    const apps = db.prepare('SELECT port FROM apps WHERE status = ?').all('running');
    const usedPorts = apps.map(a => a.port);
    const port = getNextAppPort(usedPorts);

    // Kill existing process for this slug if any
    const existing = db.prepare('SELECT * FROM apps WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (existing) {
      const pid = Number(existing.container_id);
      const proc = processes.get(pid);
      if (proc) killProcessGroup(proc.pid);
      processes.delete(pid);
      // Also kill anything on the old port
      try { const { execSync } = await import('child_process'); execSync(`fuser -k ${existing.port}/tcp`, { timeout: 3000, stdio: 'pipe' }); } catch {}
      db.prepare('UPDATE apps SET status = ? WHERE id = ?').run('stopped', existing.id);
    }

    const projectRoot = findProjectRoot(`/projects/${projectSlug}`);
    console.log(`[app-manager] Starting ${projectSlug}: root=${projectRoot}, port=${port}, cmd="${startCommand}"`);

    // Auto-install dependencies if node_modules doesn't exist but package.json does
    if (existsSync(join(projectRoot, 'package.json')) && !existsSync(join(projectRoot, 'node_modules'))) {
      try {
        const { execSync } = await import('child_process');
        console.log('[app-manager] Running npm install for', projectSlug);
        execSync('npm install', { cwd: projectRoot, timeout: 120000, stdio: 'pipe' });
      } catch (err) {
        console.error('[app-manager] npm install failed:', err.message);
      }
    }

    // Auto-detect start command if using default 'npm start' but project lacks it
    if (startCommand === 'npm start') {
      try {
        const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
        const scripts = pkg.scripts || {};
        if (!scripts.start) {
          if (scripts.dev) startCommand = 'npm run dev -- --port $PORT --host';
          else if (scripts.preview) startCommand = 'npm run preview -- --port $PORT --host';
        }
      } catch {}
    }

    const proc = spawn('/bin/sh', ['-c', startCommand], {
      cwd: projectRoot,
      env: { ...process.env, PORT: String(port) },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    processes.set(proc.pid, proc);

    // Capture stdout/stderr logs
    const logs = [];
    appLogs.set(projectSlug, logs);
    const appendLog = (stream, data) => {
      const lines = data.toString().split('\n').filter(l => l.length > 0);
      for (const line of lines) {
        const entry = { time: Date.now(), stream, text: line };
        logs.push(entry);
        if (logs.length > MAX_LOG_LINES) logs.shift();
        eventBus.publish('app.log', { stream, text: line }, projectId);
      }
    };
    proc.stdout.on('data', d => appendLog('stdout', d));
    proc.stderr.on('data', d => appendLog('stderr', d));

    proc.on('exit', (code) => {
      processes.delete(proc.pid);
      const entry = { time: Date.now(), stream: 'system', text: `Process exited with code ${code}` };
      logs.push(entry);
      eventBus.publish('app.log', entry, projectId);
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

  getLogs(slug) {
    return appLogs.get(slug) || [];
  },

  async killPort(port) {
    const { execSync } = await import('child_process');
    try {
      execSync(`fuser -k ${port}/tcp`, { timeout: 5000, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  },

  async killAllApps() {
    // Kill all tracked processes
    for (const [pid, proc] of processes) {
      try { proc.kill('SIGKILL'); } catch {}
      processes.delete(pid);
    }
    // Kill anything on app port range
    const { execSync } = await import('child_process');
    for (let p = APP_BASE_PORT; p < APP_BASE_PORT + MAX_APPS; p++) {
      try { execSync(`fuser -k ${p}/tcp`, { timeout: 3000, stdio: 'pipe' }); } catch {}
    }
    // Reset DB
    db.prepare("UPDATE apps SET status = 'stopped' WHERE status = 'running'").run();
    appLogs.clear();
    return true;
  },

  async clearCache(projectSlug) {
    const projectRoot = findProjectRoot(`/projects/${projectSlug}`);
    const { execSync } = await import('child_process');
    const removed = [];
    const cacheDirs = ['node_modules', '.next', 'dist', '.cache', '.nuxt', '.output', '.vite'];
    for (const dir of cacheDirs) {
      const fullPath = join(projectRoot, dir);
      if (existsSync(fullPath)) {
        execSync(`rm -rf "${fullPath}"`, { timeout: 30000 });
        removed.push(dir);
      }
    }
    return removed;
  },

  async stop(projectId, projectSlug) {
    const app = db.prepare('SELECT * FROM apps WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (!app) return null;

    const pid = Number(app.container_id);
    const proc = processes.get(pid);
    if (proc) killProcessGroup(proc.pid);
    processes.delete(pid);
    // Also kill anything left on the port
    try { const { execSync } = await import('child_process'); execSync(`fuser -k ${app.port}/tcp`, { timeout: 3000, stdio: 'pipe' }); } catch {}

    db.prepare('UPDATE apps SET status = ? WHERE id = ?').run('stopped', app.id);
    eventBus.publish('app.stopped', { projectSlug }, projectId);

    return app;
  }
};
