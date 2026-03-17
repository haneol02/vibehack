import React, { useState, useEffect } from 'react';

const cardStyle = {
  background: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
  padding: '16px', cursor: 'pointer', transition: 'border-color 0.2s'
};

export default function Dashboard({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

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
      // Auto-start session
      await fetch(`/api/sessions/${project.slug}/start`, { method: 'POST' });
      setNewName('');
      loadProjects();
      onSelectProject(project.slug);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '12px', color: '#58a6ff' }}>새 해커톤 프로젝트</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createProject()}
            placeholder="프로젝트 이름..."
            style={{
              background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3',
              padding: '8px 12px', borderRadius: '6px', fontSize: '14px', flex: 1
            }}
          />
          <button onClick={createProject} disabled={loading}
            style={{
              background: '#238636', border: 'none', color: 'white',
              padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
            }}>
            {loading ? '생성 중...' : '🚀 생성'}
          </button>
        </div>
      </div>

      <h2 style={{ marginBottom: '12px', color: '#58a6ff' }}>프로젝트 목록</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {projects.map(p => (
          <div key={p.id} style={cardStyle} onClick={() => onSelectProject(p.slug)}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#58a6ff'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#30363d'}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{p.name}</div>
            <div style={{ color: '#8b949e', fontSize: '13px' }}>{p.slug}</div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: p.status === 'active' ? '#3fb950' : '#8b949e' }}>
              ● {p.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
