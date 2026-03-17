import Docker from 'dockerode';
import { db } from './db.js';
import { eventBus } from './event-bus.js';
import { v4 as uuidv4 } from 'uuid';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const BASE_PORT = 7700;
const MAX_SESSIONS = 20;

function getNextPort(usedPorts) {
  for (let p = BASE_PORT; p < BASE_PORT + MAX_SESSIONS; p++) {
    if (!usedPorts.includes(p)) return p;
  }
  throw new Error('No available ports');
}

export const sessionManager = {
  async create(projectId, projectSlug, anthropicApiKey) {
    const sessions = db.prepare('SELECT port FROM sessions WHERE status != ?').all('stopped');
    const usedPorts = sessions.map(s => s.port);
    const port = getNextPort(usedPorts);

    const sessionId = uuidv4();
    const containerName = `vibehack-session-${projectSlug}`;

    // Remove existing container if any
    try {
      const existing = docker.getContainer(containerName);
      await existing.stop().catch(() => {});
      await existing.remove().catch(() => {});
    } catch {}

    const env = [
      `SESSION_NAME=${projectSlug}`,
      `WORKSPACE=/workspace/${projectSlug}`,
    ];
    if (anthropicApiKey || process.env.ANTHROPIC_API_KEY) {
      env.push(`ANTHROPIC_API_KEY=${anthropicApiKey || process.env.ANTHROPIC_API_KEY}`);
    }

    // ~/.claude 마운트: claude login 인증 정보 공유
    const homeDir = process.env.HOST_HOME || process.env.HOME || '/root';
    const binds = [
      `/projects/${projectSlug}:/workspace/${projectSlug}`,
      `${homeDir}/.claude:/root/.claude`,
    ];

    const container = await docker.createContainer({
      name: containerName,
      Image: 'vibehack-session-runner',
      Env: env,
      HostConfig: {
        PortBindings: { '7681/tcp': [{ HostPort: String(port) }] },
        Binds: binds,
        NetworkMode: 'vibehack',
      },
      NetworkingConfig: {
        EndpointsConfig: { vibehack: {} }
      }
    });

    await container.start();

    db.prepare(`
      INSERT INTO sessions (id, project_id, container_id, container_name, port, status)
      VALUES (?, ?, ?, ?, ?, 'running')
    `).run(sessionId, projectId, container.id, containerName, port);

    eventBus.publish('session.created', { sessionId, projectSlug, port }, projectId);

    return { sessionId, port, containerName };
  },

  async stop(projectId, projectSlug) {
    const session = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (!session) return null;

    try {
      const container = docker.getContainer(session.container_name);
      await container.stop();
      await container.remove();
    } catch {}

    db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run('stopped', session.id);
    eventBus.publish('session.stopped', { projectSlug }, projectId);

    return session;
  },

  async send(projectSlug, text) {
    const containerName = `vibehack-session-${projectSlug}`;
    const container = docker.getContainer(containerName);
    const exec = await container.exec({
      Cmd: ['tmux', 'send-keys', '-t', projectSlug, text, 'Enter'],
      AttachStdout: true,
      AttachStderr: true,
    });
    await exec.start({});
  },

  async getLog(projectSlug) {
    const containerName = `vibehack-session-${projectSlug}`;
    try {
      const container = docker.getContainer(containerName);
      const exec = await container.exec({
        Cmd: ['tmux', 'capture-pane', '-p', '-S', '-100', '-t', projectSlug],
        AttachStdout: true,
        AttachStderr: true,
      });
      const stream = await exec.start({});
      return new Promise((resolve) => {
        let output = '';
        stream.on('data', d => output += d.toString());
        stream.on('end', () => resolve(output));
      });
    } catch (err) {
      return `Error getting log: ${err.message}`;
    }
  }
};
