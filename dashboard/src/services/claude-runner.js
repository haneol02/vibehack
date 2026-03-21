import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { db } from './db.js';
import { eventBus } from './event-bus.js';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

const PLATFORM_MARKER_START = '<!-- VIBEHACK PLATFORM - DO NOT EDIT THIS SECTION -->';
const PLATFORM_MARKER_END = '<!-- END VIBEHACK PLATFORM -->';

function generatePlatformInfo(slug) {
  const domain = process.env.DOMAIN || 'localhost';
  return `${PLATFORM_MARKER_START}
# Vibehack Platform

## 환경 정보
- OS: Linux (Docker 컨테이너)
- 작업 디렉토리: /projects/${slug}
- Node.js, npm 사용 가능
- 앱 URL: https://${slug}.${domain}

## ⚠️ 중요 규칙

### 서버를 직접 실행하지 마세요
- \`node server.js\`, \`npm start\`, \`npx vite\`, \`npm run dev\` 등 **서버 시작 명령을 실행하지 마세요**
- 서버는 플랫폼의 **"앱 실행" 버튼**이 자동으로 시작합니다
- 기본 실행 명령: \`npm start\` (사용자가 변경 가능)

### 포트 설정
- 서버 포트는 반드시 **\`process.env.PORT\`** 환경변수를 사용하세요
- 예시: \`app.listen(process.env.PORT || 3000, '0.0.0.0')\`
- **절대 포트를 하드코딩하지 마세요** (8080, 3000 등 고정 금지)
- 플랫폼이 각 프로젝트에 고유 포트를 자동 할당합니다

### 호스트 바인딩
- 반드시 \`0.0.0.0\`에 바인딩하세요 (localhost ❌)
- Express: \`app.listen(PORT, '0.0.0.0')\`
- Vite: \`server: { host: '0.0.0.0', port: parseInt(process.env.PORT) || 3000 }\`
- Next.js: package.json에 \`"start": "next start -H 0.0.0.0 -p $PORT"\`

## 프로젝트 구조 요구사항
\`\`\`
/projects/${slug}/
├── package.json          ← 필수: scripts.start 또는 scripts.dev 설정
├── node_modules/         ← npm install로 설치
├── CLAUDE.md             ← 이 파일 (플랫폼 정보)
└── src/                  ← 소스 코드
\`\`\`

### package.json 필수 설정
- \`npm install\`로 모든 의존성 설치 가능해야 함
- \`scripts.start\` 또는 \`scripts.dev\`가 서버를 시작해야 함
- 서버는 \`process.env.PORT\`를 사용해야 함

### 예시 package.json
\`\`\`json
{
  "scripts": {
    "start": "node server.js",
    "dev": "vite --host"
  }
}
\`\`\`

### 예시 서버 코드
\`\`\`javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\\\`Server running on port \\\${PORT}\\\`);
});
\`\`\`

## 디버깅 & 로그
- \`console.log()\`와 \`console.error()\`를 적극 사용하세요
- 앱의 stdout/stderr 출력은 플랫폼 로그 패널에 **실시간으로 표시**됩니다
- 에러 발생 시 \`console.error()\`로 명확한 에러 메시지를 남기세요
- 서버 시작 시 포트 번호를 로그로 출력하면 디버깅에 도움됩니다

## 주의사항
- **한국어로 응답**하세요 (사용자가 한국어로 대화합니다)
- **빌드+실행 명령 분리**: \`next build && next start\`처럼 빌드와 실행을 한 명령에 넣으면 포트 충돌이 발생할 수 있습니다. package.json의 \`start\` 스크립트에 빌드를 포함하세요
- **프로세스를 백그라운드로 실행하지 마세요** (\`&\`, \`nohup\`, \`pm2\` 등 사용 금지)
- 코드를 작성하고 **직접 테스트하지 마세요** — 테스트는 사용자가 "앱 실행" 버튼으로 합니다
- 기존 파일 수정 시 전체를 다시 쓰기보다 필요한 부분만 수정하세요
${PLATFORM_MARKER_END}`;
}

function updateClaudeMd(projectDir, slug) {
  const filePath = `${projectDir}/CLAUDE.md`;
  const platformInfo = generatePlatformInfo(slug);

  if (!existsSync(filePath)) {
    writeFileSync(filePath, platformInfo + '\n');
    return;
  }

  const existing = readFileSync(filePath, 'utf8');
  const startIdx = existing.indexOf(PLATFORM_MARKER_START);
  const endIdx = existing.indexOf(PLATFORM_MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing platform section
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + PLATFORM_MARKER_END.length);
    writeFileSync(filePath, before + platformInfo + after);
  } else {
    // Prepend platform section
    writeFileSync(filePath, platformInfo + '\n\n' + existing);
  }
}

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

  async run(slug, projectId, prompt, username = '사용자', source = 'web', model = null) {
    if (running.get(slug)) {
      throw new Error('Claude가 이미 실행 중입니다');
    }

    const projectDir = `/projects/${slug}`;
    mkdirSync(projectDir, { recursive: true });

    // Inject/update CLAUDE.md with platform info before every Claude run
    updateClaudeMd(projectDir, slug);

    // Save user message
    const userMsgId = uuidv4();
    db.prepare('INSERT INTO messages (id, project_id, role, content, username, source) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userMsgId, projectId, 'user', prompt, username, source);

    running.set(slug, true);
    eventBus.publish('chat.start', { username, message: prompt, messageId: userMsgId, source }, projectId);

    // Build context from recent conversation history (last 5 exchanges)
    const history = db.prepare(
      'SELECT role, content, username FROM messages WHERE project_id = ? AND id != ? ORDER BY created_at DESC LIMIT 5'
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
        const args = ['-p', contextPrompt, '--output-format', 'stream-json', '--verbose', '--max-turns', '30', '--allowedTools', 'Bash,Write,Edit,MultiEdit,Read,Glob,Grep,LS,TodoWrite,TodoRead,WebFetch,WebSearch'];
        if (model) args.push('--model', model);
        const proc = spawn('claude', args, {
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
        proc.stderr.on('data', (d) => {
          const chunk = d.toString();
          stderrData += chunk;
          chunk.split('\n').filter(l => l.trim()).forEach(l => console.log(`[claude:${slug}]`, l));
        });

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
