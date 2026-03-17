import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard.jsx';
import Session from './Session.jsx';

const styles = {
  app: { minHeight: '100vh', background: '#0d1117' },
  nav: {
    background: '#161b22', borderBottom: '1px solid #30363d',
    padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px'
  },
  logo: { fontSize: '20px', fontWeight: 700, color: '#58a6ff' },
  content: { padding: '24px' }
};

export default function App() {
  const [activeSlug, setActiveSlug] = useState(null);

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <span style={styles.logo}>⚡ VibHack</span>
        {activeSlug && (
          <button onClick={() => setActiveSlug(null)}
            style={{ background: 'none', border: '1px solid #30363d', color: '#e6edf3', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer' }}>
            ← 대시보드
          </button>
        )}
      </nav>
      <div style={styles.content}>
        {activeSlug
          ? <Session slug={activeSlug} onBack={() => setActiveSlug(null)} />
          : <Dashboard onSelectProject={setActiveSlug} />
        }
      </div>
    </div>
  );
}
