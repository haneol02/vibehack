import React, { useState, useEffect } from 'react';

export default function Dashboard({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const loadProjects = async () => {
    const res = await fetch('/api/projects');
    setProjects(await res.json());
  };

  useEffect(() => { loadProjects(); }, []);

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
      loadProjects();
      onSelectProject(project.slug);
    }
    setLoading(false);
  };

  const statusColor = (status) => {
    if (status === 'active') return '#3fb950';
    if (status === 'running') return '#5b8af5';
    return '#484d5a';
  };

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        padding: '80px 32px 60px',
        textAlign: 'center',
        maxWidth: '720px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(91,138,245,0.1)',
          border: '1px solid rgba(91,138,245,0.25)',
          borderRadius: '20px',
          padding: '5px 14px',
          fontSize: '12px',
          color: '#7aa0f7',
          marginBottom: '28px',
          fontWeight: 500,
          letterSpacing: '0.3px',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#5b8af5' }} />
          AI Hackathon Builder
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-1px',
          marginBottom: '16px',
          color: '#f0f1f7',
        }}>
          아이디어를{' '}
          <span style={{
            background: 'linear-gradient(135deg, #5b8af5 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            실행 가능한 앱
          </span>
          으로
        </h1>

        <p style={{
          color: '#5a6070',
          fontSize: '16px',
          lineHeight: 1.7,
          marginBottom: '40px',
        }}>
          프로젝트 이름을 입력하고 AI와 함께 해커톤을 시작하세요.
        </p>

        {/* Create Input */}
        <div style={{
          display: 'flex',
          gap: '10px',
          background: '#0e0f17',
          border: `1px solid ${focused ? 'rgba(91,138,245,0.5)' : '#1e2130'}`,
          borderRadius: '14px',
          padding: '8px 8px 8px 20px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(91,138,245,0.08)' : 'none',
          maxWidth: '560px',
          margin: '0 auto',
        }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProject()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="프로젝트 이름을 입력하세요..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#e8eaf0',
              fontSize: '15px',
              flex: 1,
              minWidth: 0,
            }}
          />
          <button
            onClick={createProject}
            disabled={loading}
            style={{
              background: loading ? '#2a2d3e' : 'linear-gradient(135deg, #5b8af5, #7c6af7)',
              border: 'none',
              color: 'white',
              padding: '10px 22px',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {loading ? '생성 중...' : '🚀 시작하기'}
          </button>
        </div>
      </div>

      {/* Project List */}
      {projects.length > 0 && (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px 60px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#8892a4', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              프로젝트
            </h2>
            <span style={{
              background: '#12131e',
              border: '1px solid #1e2130',
              color: '#5a6070',
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '10px',
            }}>
              {projects.length}개
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '14px',
          }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => onSelectProject(p.slug)} statusColor={statusColor} />
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 32px', color: '#2e3244' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚀</div>
          <div style={{ fontSize: '14px' }}>첫 번째 프로젝트를 만들어보세요</div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, onClick, statusColor }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#0e0f17' : '#0b0c14',
        border: `1px solid ${hovered ? 'rgba(91,138,245,0.35)' : '#1a1d2e'}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: hovered ? '0 4px 24px rgba(91,138,245,0.08)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(91,138,245,0.2), rgba(139,92,246,0.2))',
          border: '1px solid rgba(91,138,245,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
        }}>
          ⚡
        </div>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11px',
          color: statusColor(p.status),
          background: `${statusColor(p.status)}18`,
          border: `1px solid ${statusColor(p.status)}30`,
          padding: '3px 9px',
          borderRadius: '10px',
          fontWeight: 500,
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColor(p.status) }} />
          {p.status}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: '15px', color: '#e0e2ed', marginBottom: '4px' }}>{p.name}</div>
      <div style={{ color: '#383c52', fontSize: '12px', fontFamily: 'monospace' }}>{p.slug}</div>
    </div>
  );
}
