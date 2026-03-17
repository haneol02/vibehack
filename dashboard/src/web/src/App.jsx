import React, { useState } from 'react';
import Dashboard from './Dashboard.jsx';
import Session from './Session.jsx';

export default function App() {
  const [activeSlug, setActiveSlug] = useState(null);
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list'

  return (
    <div style={{ minHeight: '100vh', background: '#08090e', color: '#e8eaf0', fontFamily: "'Pretendard', 'Noto Sans KR', 'Segoe UI', sans-serif" }}>
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
        <span
          onClick={() => { setActiveSlug(null); setActiveTab('new'); }}
          style={{ fontSize: '17px', fontWeight: 800, color: '#fff', cursor: 'pointer', letterSpacing: '-0.5px' }}
        >
          Vibe<span style={{ color: '#5b8af5' }}>Hack</span>
        </span>

        {activeSlug ? (
          <button onClick={() => setActiveSlug(null)} style={{
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
        ) : (
          <div style={{ display: 'flex', gap: '2px', background: '#0d0e18', border: '1px solid #16182a', borderRadius: '8px', padding: '3px' }}>
            {[['new', '새 프로젝트'], ['list', '내 프로젝트']].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#1a1d2e' : 'none',
                  border: 'none',
                  color: activeTab === tab ? '#e8eaf0' : '#484d5a',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === tab ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div>
        {activeSlug
          ? <Session slug={activeSlug} onBack={() => setActiveSlug(null)} />
          : <Dashboard activeTab={activeTab} onSelectProject={setActiveSlug} onTabChange={setActiveTab} />
        }
      </div>
    </div>
  );
}
