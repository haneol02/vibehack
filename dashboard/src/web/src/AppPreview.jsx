import React from 'react';

export default function AppPreview({ slug, domain }) {
  const url = `https://${slug}.${domain}`;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{url}</span>
        <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '12px' }}>↗ 새탭</a>
      </div>
      <iframe src={url} style={{ flex: 1, border: 'none', width: '100%' }} title="App Preview" />
    </div>
  );
}
