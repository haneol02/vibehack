import React, { useState, useEffect, useRef } from 'react';

export default function LogPanel({ slug }) {
  const [events, setEvents] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const es = new EventSource(`/api/events/stream?projectId=${slug}`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        setEvents(prev => [...prev.slice(-200), event]);
      } catch {}
    };

    return () => es.close();
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const typeColor = {
    'session.created': '#58a6ff',
    'session.stopped': '#f85149',
    'app.started': '#3fb950',
    'app.stopped': '#f85149',
    'claude.message': '#d2a8ff',
  };

  return (
    <div style={{ flex: 1, background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #30363d', fontSize: '13px', color: '#8b949e' }}>
        이벤트 로그
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
        {events.length === 0 && (
          <div style={{ color: '#8b949e', padding: '8px' }}>이벤트 대기 중...</div>
        )}
        {events.map((e, i) => (
          <div key={i} style={{ marginBottom: '4px', lineHeight: 1.4 }}>
            <span style={{ color: '#8b949e' }}>{new Date(e.timestamp || e.created_at).toLocaleTimeString()} </span>
            <span style={{ color: typeColor[e.type] || '#e6edf3' }}>[{e.type}] </span>
            <span style={{ color: '#e6edf3' }}>{JSON.stringify(typeof e.data === 'string' ? JSON.parse(e.data) : e.data)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
