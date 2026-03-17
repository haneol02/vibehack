import React, { useState } from 'react';
import Dashboard from './Dashboard.jsx';
import Session from './Session.jsx';

export default function App() {
  const [activeSlug, setActiveSlug] = useState(null);

  return (
    <div style={{ minHeight: '100vh', background: '#08090e', color: '#e8eaf0', fontFamily: "'Pretendard', 'Noto Sans KR', 'Segoe UI', sans-serif" }}>
      <nav style={{
        background: 'rgba(8,9,14,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1a1d2e',
        padding: '0 32px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span
          onClick={() => setActiveSlug(null)}
          style={{ fontSize: '18px', fontWeight: 800, color: '#5b8af5', cursor: 'pointer', letterSpacing: '-0.3px' }}
        >
          ⚡ VibHack
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {activeSlug && (
            <button onClick={() => setActiveSlug(null)} style={{
              background: 'rgba(91,138,245,0.12)',
              border: '1px solid rgba(91,138,245,0.3)',
              color: '#5b8af5',
              padding: '6px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}>
              ← 대시보드
            </button>
          )}
          {!activeSlug && (
            <span style={{
              background: 'rgba(91,138,245,0.15)',
              border: '1px solid rgba(91,138,245,0.25)',
              color: '#7aa0f7',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
              대시보드
            </span>
          )}
        </div>
      </nav>
      <div style={{ padding: '0' }}>
        {activeSlug
          ? <Session slug={activeSlug} onBack={() => setActiveSlug(null)} />
          : <Dashboard onSelectProject={setActiveSlug} />
        }
      </div>
    </div>
  );
}
