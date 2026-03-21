import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import Session from './Session.jsx';
import Login from './Login.jsx';
import { useTheme } from './ThemeContext.jsx';

function ThemeSwitcher() {
  const { theme, setTheme, THEMES } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = THEMES.find(t => t.id === theme) || THEMES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)',
          color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 10px',
          borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
        }}
      >
        {current.emoji} {current.label} <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)',
          borderRadius: '8px', padding: '4px', minWidth: '160px', zIndex: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                background: theme === t.id ? 'var(--accent-bg)' : 'none',
                border: 'none', color: theme === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '12px', padding: '6px 10px', borderRadius: '5px',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (theme !== t.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { if (theme !== t.id) e.currentTarget.style.background = 'none'; }}
            >
              <span>{t.emoji}</span>
              <span style={{ fontWeight: theme === t.id ? 600 : 400 }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Nav({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSession = location.pathname.startsWith('/project/');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  };

  return (
    <nav style={{
      background: 'var(--bg-nav)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-primary)',
      padding: '0 16px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', textDecoration: 'none', letterSpacing: '-0.5px' }}>
        Vibe<span style={{ color: 'var(--accent)' }}>Hack</span>
      </Link>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ThemeSwitcher />
        {isSession && (
          <button onClick={() => navigate('/')} style={{
            background: 'none',
            border: '1px solid var(--border-active)',
            color: 'var(--text-tertiary)',
            padding: '5px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            ← 돌아가기
          </button>
        )}
        <button onClick={handleLogout} style={{
          background: 'none',
          border: '1px solid var(--border-active)',
          color: 'var(--text-muted)',
          padding: '5px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          로그아웃
        </button>
      </div>
    </nav>
  );
}

function SessionPage() {
  const { slug } = useParams();
  return <Session slug={slug} />;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => setAuthenticated(data.authenticated));
  }, []);

  if (authenticated === null) return null;

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Pretendard', 'Noto Sans KR', 'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <Nav onLogout={() => setAuthenticated(false)} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:slug" element={<SessionPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
