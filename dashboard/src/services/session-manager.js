import { db } from './db.js';
import { eventBus } from './event-bus.js';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync } from 'fs';

export const sessionManager = {
  create(projectId, projectSlug) {
    const existing = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (existing) return existing;

    mkdirSync(`/projects/${projectSlug}`, { recursive: true });

    const sessionId = uuidv4();
    db.prepare('INSERT INTO sessions (id, project_id, status) VALUES (?, ?, ?)').run(sessionId, projectId, 'running');

    eventBus.publish('session.created', { sessionId, projectSlug }, projectId);
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  },

  stop(projectId, projectSlug) {
    const session = db.prepare('SELECT * FROM sessions WHERE project_id = ? AND status = ?').get(projectId, 'running');
    if (!session) return null;

    db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run('stopped', session.id);
    eventBus.publish('session.stopped', { projectSlug }, projectId);
    return session;
  },
};
