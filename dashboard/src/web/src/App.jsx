import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import Session from './Session.jsx';
import Login from './Login.jsx';

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
      background: 'rgba(8,9,14,0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #16182a',
      padding: '0 32px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{ fontSize: '17px', fontWeight: 800, color: '#fff', textDecoration: 'none', letterSpacing: '-0.5px' }}>
        Vibe<span style={{ color: '#5b8af5' }}>Hack</span>
      </Link>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {isSession && (
          <button onClick={() => navigate('/')} style={{
            background: 'none',
            border: '1px solid #1e2235',
            color: '#8892a4',
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
          border: '1px solid #1e2235',
          color: '#484d5a',
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
      <div style={{ minHeight: '100vh', background: '#08090e', color: '#e8eaf0', fontFamily: "'Pretendard', 'Noto Sans KR', 'Segoe UI', sans-serif" }}>
        <Nav onLogout={() => setAuthenticated(false)} />
        <div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:slug" element={<SessionPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
