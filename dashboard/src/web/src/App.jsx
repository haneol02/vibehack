import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import Session from './Session.jsx';
import Login from './Login.jsx';
import { useTheme } from './ThemeContext.jsx';

function ThemeSwitcher() {
  const { theme, setTheme, THEMES } = useTheme();
  return (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-primary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-secondary)' }}>
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          style={{
            background: theme === t.id ? 'var(--accent-bg)' : 'none',
            border: 'none',
            color: theme === t.id ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontWeight: theme === t.id ? 600 : 400,
          }}
        >{t.label}</button>
      ))}
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
      padding: '0 32px',
      height: '56px',
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
