import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const loadProjects = async () => {
    const res = await fetch('/api/projects');
    setProjects(await res.json());
  };

  useEffect(() => { loadProjects(); }, []);

  const deleteProject = async (slug) => {
    if (!confirm(`"${slug}" 프로젝트를 삭제할까요?\n컨테이너와 데이터가 모두 제거됩니다.`)) return;
    await fetch(`/api/projects/${slug}`, { method: 'DELETE' });
    loadProjects();
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    const project = await res.json();
    if (!project.error) {
      await fetch(`/api/sessions/${project.slug}/start`, { method: 'POST' });
      setNewName('');
      navigate(`/project/${project.slug}`);
    }
    setLoading(false);
  };

  const statusColor = (s) => s === 'running' ? '#3fb950' : '#2e3244';
  const statusLabel = (s) => s === 'running' ? '실행 중' : '중단됨';

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}><div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px 60px' }}>
      <style>{`.hero-title { white-space: nowrap; } @media (max-width: 560px) { .hero-title { white-space: normal; } }`}</style>

      {/* New project form */}
      <div style={{ textAlign: 'center', marginBottom: '56px' }}>
        <h1
          className="hero-title"
          style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-1px', marginBottom: '12px', color: '#f0f1f7' }}
        >
          아이디어를{' '}
          <span style={{ background: 'linear-gradient(135deg, #5b8af5, #9b72f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            실행 가능한 앱으로
          </span>
        </h1>
        <p style={{ color: '#3e4358', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
          프로젝트 이름을 입력하면 AI가 환경을 구성하고 개발을 시작합니다.
        </p>
        <div style={{
          display: 'flex',
          background: '#0c0d15',
          border: `1px solid ${focused ? '#3a4a7a' : '#1a1d2e'}`,
          borderRadius: '12px',
          padding: '6px 6px 6px 18px',
          transition: 'border-color 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(91,138,245,0.07)' : 'none',
          maxWidth: '520px',
          margin: '0 auto',
        }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProject()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="새 프로젝트 이름..."
            style={{ background: 'none', border: 'none', outline: 'none', color: '#e8eaf0', fontSize: '15px', flex: 1, minWidth: 0, padding: '6px 0' }}
          />
          <button
            onClick={createProject}
            disabled={loading}
            style={{
              background: loading ? '#1a1d2e' : '#5b8af5',
              border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600,
              whiteSpace: 'nowrap', flexShrink: 0, opacity: loading ? 0.5 : 1, transition: 'background 0.2s, opacity 0.2s',
            }}
          >
            {loading ? '생성 중...' : '시작하기'}
          </button>
        </div>
      </div>

      {/* Project list */}
      {projects.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#484d5a' }}>내 프로젝트 ({projects.length})</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => navigate(`/project/${p.slug}`)}
                onDelete={deleteProject}
                statusColor={statusColor}
                statusLabel={statusLabel}
              />
            ))}
          </div>
        </div>
      )}
    </div></div>
  );
}

function ProjectCard({ project: p, onClick, onDelete, statusColor, statusLabel }) {
  const [hovered, setHovered] = useState(false);
  const initial = p.name ? p.name[0].toUpperCase() : '?';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#0d0e18' : '#0b0c15',
        border: `1px solid ${hovered ? '#2a3050' : '#14162a'}`,
        borderRadius: '10px', padding: '16px', cursor: 'pointer',
        transition: 'all 0.15s', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #1e2a50, #241a3a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: '#7090d0',
        }}>
          {initial}
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: statusColor(p.session_status), fontWeight: 500 }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColor(p.session_status), flexShrink: 0 }} />
          {statusLabel(p.session_status)}
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '13px', color: '#c8ccd8', marginBottom: '3px' }}>{p.name}</div>
      <div style={{ color: '#252838', fontSize: '11px', fontFamily: 'monospace', marginBottom: '12px' }}>{p.slug}</div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={e => { e.stopPropagation(); onDelete(p.slug); }}
          style={{ background: 'none', border: '1px solid #2a1a1a', color: '#6b3030', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', flex: 1, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1a0a0a'; e.currentTarget.style.color = '#e05050'; e.currentTarget.style.borderColor = '#5a2020'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b3030'; e.currentTarget.style.borderColor = '#2a1a1a'; }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
