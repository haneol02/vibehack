import React, { useState, useEffect, useRef } from 'react';

export default function LogPanel({ slug, projectId }) {
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);
  const autoScrollRef = useRef(true);
  const containerRef = useRef(null);

  // Load existing logs on mount
  useEffect(() => {
    fetch(`/api/apps/${slug}/logs`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLogs(data); })
      .catch(() => {});
  }, [slug]);

  // Listen for new logs via SSE
  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/events/stream?projectId=${projectId}`);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'app.log') {
          const entry = { ...event.data, time: event.data.time || event.timestamp || Date.now() };
          setLogs(prev => {
            const next = [...prev, entry];
            return next.length > 500 ? next.slice(-500) : next;
          });
        } else if (event.type === 'app.started') {
          setLogs([{ time: event.timestamp || Date.now(), stream: 'system', text: `App started (port ${event.data?.port})` }]);
        }
      } catch {}
    };
    return () => es.close();
  }, [projectId]);

  // Auto-scroll
  useEffect(() => {
    if (autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const streamColor = (s) => {
    if (s === 'stderr') return '#f85149';
    if (s === 'system') return '#8b8af5';
    return '#c8ccd8';
  };

  const clearLogs = () => setLogs([]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#08090e' }}>
      {/* Header */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #14162a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: '#484d5a' }}>
          {logs.length}줄
        </span>
        <button
          onClick={clearLogs}
          style={{ background: 'none', border: '1px solid #1a1d2e', color: '#484d5a', borderRadius: '4px', fontSize: '10px', padding: '2px 8px', cursor: 'pointer' }}
        >
          지우기
        </button>
      </div>

      {/* Log content */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6, minHeight: 0 }}>
        {logs.length === 0 && (
          <div style={{ color: '#252838', textAlign: 'center', marginTop: '40px', fontSize: '12px', fontFamily: 'inherit' }}>
            앱을 실행하면 로그가 여기에 표시됩니다
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '1px' }}>
            <span style={{ color: '#2e3244', flexShrink: 0, userSelect: 'none' }}>
              {log.time ? new Date(log.time).toLocaleTimeString('ko-KR', { hour12: false }) : '--:--:--'}
            </span>
            <span style={{ color: streamColor(log.stream), wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
              {log.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
