import React, { useState, useEffect } from 'react';

export default function Dashboard({ activeTab, onSelectProject, onTabChange }) {
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
      onSelectProject(project.slug);
    }
    setLoading(false);
  };

  return (
    <div>
      <style>{`
        .hero-title { white-space: nowrap; }
        @media (max-width: 560px) { .hero-title { white-space: normal; } }
      `}</style>

      {activeTab === 'new' ? (
        <NewProjectView
          newName={newName}
          setNewName={setNewName}
          loading={loading}
          focused={focused}
          setFocused={setFocused}
          createProject={createProject}
          onViewProjects={() => onTabChange('list')}
          projectCount={projects.length}
        />
      ) : (
        <ProjectListView
          projects={projects}
          onSelectProject={onSelectProject}
          onNewProject={() => onTabChange('new')}
        />
      )}
    </div>
  );
}

function NewProjectView({ newName, setNewName, loading, focused, setFocused, createProject, onViewProjects, projectCount }) {
  return (
    <div style={{ padding: '72px 24px 60px', textAlign: 'center' }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>
        <h1
          className="hero-title"
          style={{
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-1.5px',
            marginBottom: '14px',
            color: '#f0f1f7',
          }}
        >
          아이디어를{' '}
          <span style={{
            background: 'linear-gradient(135deg, #5b8af5, #9b72f5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            실행 가능한 앱으로
          </span>
        </h1>

        <p style={{ color: '#3e4358', fontSize: '15px', lineHeight: 1.7, marginBottom: '36px' }}>
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
          marginBottom: '20px',
        }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProject()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="프로젝트 이름..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#e8eaf0',
              fontSize: '15px',
              flex: 1,
              minWidth: 0,
              padding: '6px 0',
            }}
          />
          <button
            onClick={createProject}
            disabled={loading}
            style={{
              background: loading ? '#1a1d2e' : '#5b8af5',
              border: 'none',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              opacity: loading ? 0.5 : 1,
              transition: 'background 0.2s, opacity 0.2s',
            }}
          >
            {loading ? '생성 중...' : '시작하기'}
          </button>
        </div>

        {projectCount > 0 && (
          <button
            onClick={onViewProjects}
            style={{
              background: 'none',
              border: 'none',
              color: '#3e4358',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '4px 8px',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            기존 프로젝트 {projectCount}개 보기
          </button>
        )}
      </div>
    </div>
  );
}

function ProjectListView({ projects, onSelectProject, onNewProject }) {
  const statusColor = (status) => {
    if (status === 'active') return '#3fb950';
    if (status === 'running') return '#5b8af5';
    return '#2e3244';
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#c8ccd8', marginBottom: '4px' }}>내 프로젝트</h2>
          <p style={{ fontSize: '13px', color: '#2e3244' }}>{projects.length}개의 프로젝트</p>
        </div>
        <button
          onClick={onNewProject}
          style={{
            background: '#5b8af5',
            border: 'none',
            color: 'white',
            padding: '8px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          + 새 프로젝트
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          border: '1px dashed #16182a',
          borderRadius: '12px',
          color: '#2e3244',
        }}>
          <div style={{ fontSize: '13px', marginBottom: '12px' }}>아직 프로젝트가 없습니다</div>
          <button onClick={onNewProject} style={{
            background: 'none', border: '1px solid #1a1d2e', color: '#484d5a',
            padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
          }}>
            첫 프로젝트 만들기
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => onSelectProject(p.slug)} statusColor={statusColor} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, onClick, statusColor }) {
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
        borderRadius: '10px',
        padding: '18px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #1e2a50, #241a3a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: '#7090d0',
        }}>
          {initial}
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: '11px', color: statusColor(p.status),
          fontWeight: 500,
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColor(p.status), flexShrink: 0 }} />
          {p.status}
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '14px', color: '#c8ccd8', marginBottom: '4px' }}>{p.name}</div>
      <div style={{ color: '#252838', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.3px' }}>{p.slug}</div>
    </div>
  );
}
