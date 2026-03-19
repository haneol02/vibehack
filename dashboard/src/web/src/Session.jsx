import React, { useState, useEffect } from 'react';
import Chat from './Chat.jsx';
import LogPanel from './LogPanel.jsx';

export default function Session({ slug }) {
  const [project, setProject] = useState(null);
  const [app, setApp] = useState(null);
  const [startCmd, setStartCmd] = useState('npm start');
  const [tab, setTab] = useState('chat');
  const domain = window.location.hostname;

  useEffect(() => {
    const load = async () => {
      const [p, a] = await Promise.all([
        fetch(`/api/projects/${slug}`).then(r => r.json()),
        fetch(`/api/apps/${slug}`).then(r => r.json()),
      ]);
      setProject(p);
      setApp(a);
      fetch(`/api/sessions/${slug}/start`, { method: 'POST' }).catch(() => {});
    };
    load();
    const interval = setInterval(() => {
      fetch(`/api/apps/${slug}`).then(r => r.json()).then(setApp);
    }, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  const startApp = async () => {
    const res = await fetch(`/api/apps/${slug}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startCommand: startCmd })
    });
    setApp(await res.json());
  };

  const stopApp = async () => {
    await fetch(`/api/apps/${slug}/stop`, { method: 'POST' });
    setApp({ status: 'stopped' });
  };

  const killAll = async () => {
    if (!confirm('모든 앱 프로세스와 포트를 초기화하시겠습니까?')) return;
    await fetch('/api/apps/kill-all', { method: 'POST' });
    setApp({ status: 'stopped' });
    alert('초기화 완료');
  };

  const clearCache = async () => {
    if (!confirm('캐시를 삭제하시겠습니까? (node_modules, .next, dist 등)')) return;
    const res = await fetch(`/api/apps/${slug}/clear-cache`, { method: 'POST' });
    const data = await res.json();
    if (data.removed?.length) alert(`삭제됨: ${data.removed.join(', ')}`);
    else alert('삭제할 캐시가 없습니다');
  };

  const proto = window.location.protocol;
  const appUrl = `${proto}//${slug}.${domain}`;
  const vscodeUrl = `${proto}//vscode-vibehack.haneol.kr/?folder=/home/coder/projects/${slug}`;

  const tabStyle = (active) => ({
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? 'var(--text-secondary)' : 'var(--text-dimmed)',
    fontSize: '12px',
    fontWeight: 600,
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: '100%', overflow: 'hidden' }}>
      {/* Left: App preview */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', borderRight: '1px solid var(--border-primary)' }}>
        {/* App control bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: 'var(--bg-secondary)' }}>
          <input
            value={startCmd}
            onChange={e => setStartCmd(e.target.value)}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', borderRadius: '6px', color: 'var(--text-tertiary)', padding: '5px 10px', fontSize: '12px', width: '160px', outline: 'none', fontFamily: 'monospace' }}
          />
          <a
            href={vscodeUrl}
            target="_blank"
            rel="noreferrer"
            style={{ background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '5px', fontSize: '11px', textDecoration: 'none', flexShrink: 0 }}
          >VS Code</a>
          <button onClick={clearCache}
            style={{ background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-secondary)'; }}
          >캐시 삭제</button>
          <button onClick={killAll}
            style={{ background: 'none', border: '1px solid var(--error-border)', color: 'var(--error-muted)', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'var(--error-border-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--error-muted)'; e.currentTarget.style.borderColor = 'var(--error-border)'; }}
          >전체 초기화</button>

          {app?.status === 'running' ? (
            <>
              <a href={appUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--success)', fontSize: '12px', textDecoration: 'none' }}>
                {slug}.{domain}
              </a>
              <button onClick={stopApp}
                style={{ background: 'none', border: '1px solid var(--error-border)', color: 'var(--error-muted)', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'var(--error-border-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--error-muted)'; e.currentTarget.style.borderColor = 'var(--error-border)'; }}
              >중단</button>
            </>
          ) : (
            <button onClick={startApp}
              style={{ background: 'none', border: '1px solid var(--success-border)', color: 'var(--success-muted)', padding: '4px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--success)'; e.currentTarget.style.borderColor = 'var(--success-border-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--success-muted)'; e.currentTarget.style.borderColor = 'var(--success-border)'; }}
            >앱 실행</button>
          )}
        </div>

        {/* App iframe */}
        <div style={{ flex: 1, position: 'relative', background: 'var(--bg-secondary)' }}>
          {app?.status === 'running' ? (
            <iframe
              src={appUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="App Preview"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', gap: '12px' }}>
              <div style={{ fontSize: '32px' }}>🚀</div>
              <div style={{ fontSize: '14px', color: 'var(--text-dimmed)' }}>앱이 실행되면 여기서 미리볼 수 있어요</div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>우측 채팅에서 Claude에게 앱 만들기를 요청하세요</div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat / Logs with tab switching */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
          <button onClick={() => setTab('chat')} style={tabStyle(tab === 'chat')}>
            채팅
          </button>
          <button onClick={() => setTab('logs')} style={tabStyle(tab === 'logs')}>
            로그
          </button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'chat' ? 'block' : 'none' }}>
            <Chat slug={slug} projectId={project?.id} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: tab === 'logs' ? 'block' : 'none' }}>
            <LogPanel slug={slug} projectId={project?.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
