import Docker from 'dockerode';
import { db } from './db.js';
import { eventBus } from './event-bus.js';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const APP_BASE_PORT = 8100;
const MAX_APPS = 20;

function getNextAppPort(usedPorts) {
  for (let p = APP_BASE_PORT; p < APP_BASE_PORT + MAX_APPS; p++) {
    if (!usedPorts.includes(p)) return p;
  }
  throw new Error('No available app ports');
}

function updateNginxAppConfig(subdomain, port) {
  const domain = process.env.DOMAIN || 'localhost';
  const confPath = `/etc/nginx/conf.d/app-${subdomain}.conf`;
  const config = `
server {
    listen 80;
    server_name ${subdomain}.${domain};

    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
  try {
    writeFileSync(confPath, config);
    execSync('nginx -s reload');
  } catch {}
}

export const appManager = {
  async start(projectId, projectSlug, startCommand = 'npm start', appPort = 3000) {
    const apps = db.prepare('SELECT port FROM apps WHERE status = ?').all('running');
    const usedPorts = apps.map(a => a.port);
    const hostPort = getNextAppPort(usedPorts);

    const appId = uuidv4();
    const containerName = `vibehack-app-${projectSlug}`;
    const subdomain = projectSlug;

    // Remove existing
    try {
      const existing = docker.getContainer(containerName);
      await existing.stop().catch(() => {});
      await existing.remove().catch(() => {});
    } catch {}

    const container = await docker.createContainer({
      name: containerName,
      Image: 'vibehack-app-runner',
      Cmd: ['/bin/sh', '-c', `cd /app && ${startCommand}`],
      Env: [`PORT=${appPort}`],
      HostConfig: {
        PortBindings: { [`${appPort}/tcp`]: [{ HostPort: String(hostPort) }] },
        Binds: [`/projects/${projectSlug}:/app`],
        NetworkMode: 'vibehack',
      },
    });

    await container.start();

    // Update nginx config
    updateNginxAppConfig(subdomain, hostPort);

    db.prepare(`
      INSERT OR REPLACE INTO apps (id, project_id, container_id, container_name, port, app_port, subdomain, status, start_command)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?)
    `).run(appId, projectId, container.id, containerName, hostPort, appPort, subdomain, startCommand);

    const domain = process.env.DOMAIN || 'localhost';
    const url = `https://${subdomain}.${domain}`;

    eventBus.publish('app.started', { projectSlug, subdomain, url, port: hostPort }, projectId);

    return { appId, hostPort, subdomain, url };
  },

  async stop(projectId, projectSlug) {
    const app = db.prepare('SELECT * FROM apps WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (!app) return null;

    try {
      const container = docker.getContainer(app.container_name);
      await container.stop();
      await container.remove();
    } catch {}

    // Remove nginx config
    try {
      unlinkSync(`/etc/nginx/conf.d/app-${app.subdomain}.conf`);
      execSync('nginx -s reload');
    } catch {}

    db.prepare('UPDATE apps SET status = ? WHERE id = ?').run('stopped', app.id);
    eventBus.publish('app.stopped', { projectSlug }, projectId);

    return app;
  }
};
