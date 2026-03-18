import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { db } from './db.js';
import { eventBus } from './event-bus.js';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync } from 'fs';

// Track running state per project slug
const running = new Map();

function toolLabel(name, input) {
  switch (name) {
    case 'Write': return `📝 ${input?.file_path || '파일 생성'}`;
    case 'Edit': return `✏️ ${input?.file_path || '파일 수정'}`;
    case 'MultiEdit': return `✏️ ${input?.file_path || '파일 수정'}`;
    case 'Bash': return `⚡ ${(input?.command || '').slice(0, 60)}`;
    case 'Read': return `📖 ${input?.file_path || '파일 읽기'}`;
    case 'Glob': return `🔍 ${input?.pattern || '파일 검색'}`;
    case 'Grep': return `🔍 ${input?.pattern || '내용 검색'}`;
    default: return `🔧 ${name}`;
  }
}

export const claudeRunner = {
  isRunning(slug) {
    return running.get(slug) === true;
  },

  async run(slug, projectId, prompt, username = '사용자', source = 'web') {
    if (running.get(slug)) {
      throw new Error('Claude가 이미 실행 중입니다');
    }

    const projectDir = `/projects/${slug}`;
    mkdirSync(projectDir, { recursive: true });

    // Save user message
    const userMsgId = uuidv4();
    db.prepare('INSERT INTO messages (id, project_id, role, content, username, source) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userMsgId, projectId, 'user', prompt, username, source);

    running.set(slug, true);
    eventBus.publish('chat.start', { username, message: prompt, messageId: userMsgId, source }, projectId);

    // Build context from recent conversation history (last 5 exchanges)
    const history = db.prepare(
      'SELECT role, content, username FROM messages WHERE project_id = ? AND id != ? ORDER BY created_at DESC LIMIT 10'
    ).all(projectId, userMsgId).reverse();

    let contextPrompt = prompt;
    if (history.length > 0) {
      const lines = history.map(m => {
        if (m.role === 'user') return `[${m.username}]: ${m.content}`;
        try {
          const c = JSON.parse(m.content);
          return `[Claude]: ${c.text || ''}`;
        } catch {
          return `[Claude]: ${m.content}`;
        }
      }).filter(l => l.trim().length > 10);

      if (lines.length > 0) {
        contextPrompt = `이전 대화 맥락:\n${lines.join('\n')}\n\n현재 요청: ${prompt}`;
      }
    }

    let assistantText = '';
    const tools = [];
    const assistantMsgId = uuidv4();

    try {
      await new Promise((resolve, reject) => {
        const proc = spawn('claude', ['-p', contextPrompt, '--output-format', 'stream-json', '--verbose', '--max-turns', '30', '--allowedTools', 'Bash,Write,Edit,MultiEdit,Read,Glob,Grep,LS,TodoWrite,TodoRead,WebFetch,WebSearch'], {
          cwd: projectDir,
          env: { ...process.env, HOME: '/root' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        console.log('[claude-runner] spawned claude for slug:', slug);

        const rl = createInterface({ input: proc.stdout });

        rl.on('line', (line) => {
          if (!line.trim()) return;
          try {
            const event = JSON.parse(line);
            if (event.type === 'assistant') {
              for (const block of (event.message?.content || [])) {
                if (block.type === 'text' && block.text) {
                  assistantText += block.text;
                  eventBus.publish('chat.delta', { text: block.text }, projectId);
                } else if (block.type === 'tool_use') {
                  const label = toolLabel(block.name, block.input);
                  tools.push({ name: block.name, label, input: block.input });
                  eventBus.publish('chat.tool', { name: block.name, label }, projectId);
                }
              }
            } else if (event.type === 'result') {
              if (!assistantText && event.result) assistantText = event.result;
            }
          } catch {}
        });

        let stderrData = '';
        proc.stderr.on('data', (d) => { stderrData += d.toString(); });

        proc.on('close', (code) => {
          console.log('[claude-runner] claude exited code:', code, 'stderr:', stderrData.slice(0, 200));
          if (code !== 0 && !assistantText) {
            reject(new Error(stderrData || `claude exited with code ${code}`));
          } else {
            resolve();
          }
        });

        proc.on('error', reject);
      });
    } catch (err) {
      const errMsg = `오류: ${err.message}`;
      assistantText = errMsg;
      eventBus.publish('chat.error', { error: err.message }, projectId);
    } finally {
      running.set(slug, false);
    }

    // Save assistant message
    const content = JSON.stringify({ text: assistantText, tools });
    db.prepare('INSERT INTO messages (id, project_id, role, content, username, source) VALUES (?, ?, ?, ?, ?, ?)')
      .run(assistantMsgId, projectId, 'assistant', content, 'Claude', 'system');

    eventBus.publish('chat.done', { messageId: assistantMsgId, text: assistantText }, projectId);

    return { text: assistantText, tools };
  },

  getMessages(projectId, limit = 100) {
    return db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC LIMIT ?')
      .all(projectId, limit)
      .map(m => {
        if (m.role === 'assistant') {
          try { m.content = JSON.parse(m.content); } catch {}
        }
        return m;
      });
  }
};
