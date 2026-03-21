import React, { useState, useEffect, useRef } from 'react';

export default function LogPanel({ slug, projectId }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'stdout' | 'stderr' | 'system'
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
    if (s === 'stderr') return 'var(--log-stderr)';
    if (s === 'system') return 'var(--log-system)';
    return 'var(--log-stdout)';
  };

  const clearLogs = () => setLogs([]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.stream === filter);
  const errCount = logs.filter(l => l.stream === 'stderr').length;

  const filterBtnStyle = (active) => ({
    background: active ? 'var(--accent-bg)' : 'none',
    border: 'none',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setFilter('all')} style={filterBtnStyle(filter === 'all')}>전체</button>
          <button onClick={() => setFilter('stdout')} style={filterBtnStyle(filter === 'stdout')}>stdout</button>
          <button onClick={() => setFilter('stderr')} style={{
            ...filterBtnStyle(filter === 'stderr'),
            color: filter === 'stderr' ? 'var(--log-stderr)' : errCount > 0 ? 'var(--log-stderr)' : 'var(--text-muted)',
          }}>
            stderr{errCount > 0 && ` (${errCount})`}
          </button>
          <button onClick={() => setFilter('system')} style={filterBtnStyle(filter === 'system')}>system</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {filteredLogs.length}줄
          </span>
          <button
            onClick={clearLogs}
            style={{ background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: '4px', fontSize: '10px', padding: '2px 8px', cursor: 'pointer' }}
          >
            지우기
          </button>
        </div>
      </div>

      {/* Log content */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6, minHeight: 0 }}>
        {filteredLogs.length === 0 && (
          <div style={{ color: 'var(--text-faint)', textAlign: 'center', marginTop: '40px', fontSize: '12px', fontFamily: 'inherit' }}>
            {logs.length === 0 ? '앱을 실행하면 로그가 여기에 표시됩니다' : '해당 필터에 맞는 로그가 없습니다'}
          </div>
        )}
        {filteredLogs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '1px' }}>
            <span style={{ color: 'var(--log-timestamp)', flexShrink: 0, userSelect: 'none', fontSize: '10px' }}>
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
