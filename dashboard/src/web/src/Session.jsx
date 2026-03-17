import React, { useState, useEffect } from 'react';
import Chat from './Chat.jsx';

export default function Session({ slug }) {
  const [project, setProject] = useState(null);
  const [app, setApp] = useState(null);
  const [startCmd, setStartCmd] = useState('npm start');
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

  const appUrl = `http://${slug}.${domain}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Left: App preview */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #14162a' }}>
        {/* App control bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #14162a', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: '#0b0c15' }}>
          <input
            value={startCmd}
            onChange={e => setStartCmd(e.target.value)}
            style={{ background: '#08090e', border: '1px solid #1a1d2e', borderRadius: '6px', color: '#8892a4', padding: '5px 10px', fontSize: '12px', width: '160px', outline: 'none', fontFamily: 'monospace' }}
          />
          {app?.status === 'running' ? (
            <>
              <a href={appUrl} target="_blank" rel="noreferrer" style={{ color: '#3fb950', fontSize: '12px', textDecoration: 'none' }}>
                ● {slug}.{domain}
              </a>
              <button onClick={stopApp}
                style={{ background: 'none', border: '1px solid #2a1a1a', color: '#6b3030', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e05050'; e.currentTarget.style.borderColor = '#5a2020'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6b3030'; e.currentTarget.style.borderColor = '#2a1a1a'; }}
              >⏹ 중단</button>
            </>
          ) : (
            <button onClick={startApp}
              style={{ background: 'none', border: '1px solid #1a2a1a', color: '#3a6b3a', padding: '4px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#3fb950'; e.currentTarget.style.borderColor = '#2a5a2a'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3a6b3a'; e.currentTarget.style.borderColor = '#1a2a1a'; }}
            >▶ 앱 실행</button>
          )}
        </div>

        {/* App iframe */}
        <div style={{ flex: 1, position: 'relative', background: '#0b0c15' }}>
          {app?.status === 'running' ? (
            <iframe
              src={appUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="App Preview"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#252838', gap: '12px' }}>
              <div style={{ fontSize: '32px' }}>🚀</div>
              <div style={{ fontSize: '14px', color: '#3e4358' }}>앱이 실행되면 여기서 미리볼 수 있어요</div>
              <div style={{ fontSize: '11px', color: '#252838' }}>우측 채팅에서 Claude에게 앱 만들기를 요청하세요</div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat */}
      <Chat slug={slug} projectId={project?.id} />
    </div>
  );
}
