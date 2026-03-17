import React, { useState, useEffect, useRef } from 'react';
import LogPanel from './LogPanel.jsx';

export default function Session({ slug }) {
  const [session, setSession] = useState(null);
  const [app, setApp] = useState(null);
  const [startCmd, setStartCmd] = useState('npm start');
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeReady, setIframeReady] = useState(false);
  const domain = window.location.hostname;

  useEffect(() => {
    const load = async () => {
      const [s, a] = await Promise.all([
        fetch(`/api/sessions/${slug}`).then(r => r.json()),
        fetch(`/api/apps/${slug}`).then(r => r.json()),
      ]);
      setSession(s);
      setApp(a);
    };
    load();
    const interval = setInterval(load, 5000);
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

  const sessionUrl = `/proxy/session/${slug}/`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Terminal */}
        <div style={{ flex: 1, background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          {session?.status === 'running' ? (
            <>
              {!iframeReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8b949e', gap: '12px' }}>
                  <div style={{ fontSize: '13px' }}>세션 시작 중...</div>
                  <div style={{ fontSize: '11px', color: '#484d5a' }}>잠시 기다려주세요</div>
                </div>
              )}
              <iframe
                key={iframeKey}
                src={sessionUrl}
                style={{ width: '100%', height: '100%', border: 'none', opacity: iframeReady ? 1 : 0 }}
                title="Claude Code Session"
                onLoad={() => setIframeReady(true)}
                onError={() => setTimeout(() => { setIframeKey(k => k + 1); setIframeReady(false); }, 2000)}
              />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e' }}>
              세션 없음 또는 시작 중...
            </div>
          )}
        </div>

        {/* App preview */}
        {app?.status === 'running' && (
          <div style={{ height: '300px', background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#8b949e' }}>앱 미리보기</span>
              <a href={`https://${slug}.${domain}`} target="_blank" rel="noreferrer"
                style={{ color: '#58a6ff', fontSize: '12px' }}>
                외부에서 열기 ↗
              </a>
            </div>
            <iframe
              src={`https://${slug}.${domain}`}
              style={{ width: '100%', height: 'calc(100% - 37px)', border: 'none' }}
              title="App Preview"
            />
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* App control */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px', color: '#58a6ff' }}>앱 실행</h3>
          <input
            value={startCmd}
            onChange={e => setStartCmd(e.target.value)}
            style={{
              width: '100%', background: '#0d1117', border: '1px solid #30363d',
              color: '#e6edf3', padding: '6px 10px', borderRadius: '4px', fontSize: '13px',
              marginBottom: '8px'
            }}
          />
          {app?.status === 'running' ? (
            <div>
              <div style={{ fontSize: '12px', color: '#3fb950', marginBottom: '8px' }}>
                ● 실행 중: <a href={`https://${slug}.${domain}`} target="_blank" rel="noreferrer"
                  style={{ color: '#58a6ff' }}>{slug}.{domain}</a>
              </div>
              <button onClick={stopApp}
                style={{ width: '100%', background: '#da3633', border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
                ⏹ 앱 중단
              </button>
            </div>
          ) : (
            <button onClick={startApp}
              style={{ width: '100%', background: '#238636', border: 'none', color: 'white', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
              ▶ 앱 실행
            </button>
          )}
        </div>

        {/* Log panel */}
        <LogPanel slug={slug} />
      </div>
    </div>
  );
}
