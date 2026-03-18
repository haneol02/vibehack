import React, { useState, useEffect, useRef } from 'react';

function SourceIcon({ source }) {
  if (source === 'discord') {
    return <span style={{ fontSize: '10px', background: '#5865f2', color: '#fff', borderRadius: '3px', padding: '1px 5px', marginLeft: '6px' }}>Discord</span>;
  }
  return null;
}

function ToolBlock({ tool }) {
  return (
    <div style={{ fontSize: '11px', color: '#484d5a', padding: '2px 0', fontFamily: 'monospace' }}>
      {tool.label}
    </div>
  );
}

function Message({ msg, isStreaming }) {
  const isUser = msg.role === 'user';
  const content = isUser ? msg.content : (msg.content?.text || msg.content || '');
  const tools = isUser ? [] : (msg.content?.tools || []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
    }}>
      <div style={{ fontSize: '11px', color: '#484d5a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>{isUser ? (msg.username || '사용자') : 'Claude'}</span>
        {msg.source && <SourceIcon source={msg.source} />}
      </div>

      {!isUser && tools.length > 0 && (
        <div style={{
          background: '#0c0d15',
          border: '1px solid #1a1d2e',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '6px',
          width: '100%',
        }}>
          {tools.map((t, i) => <ToolBlock key={i} tool={t} />)}
        </div>
      )}

      {content && (
        <div style={{
          background: isUser ? '#1e2a50' : '#0d0e18',
          border: `1px solid ${isUser ? '#2a3a6a' : '#14162a'}`,
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          padding: '10px 14px',
          maxWidth: '90%',
          fontSize: '13px',
          lineHeight: 1.6,
          color: isUser ? '#c8d8f8' : '#c8ccd8',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content}
          {isStreaming && <span style={{ opacity: 0.5 }}>▊</span>}
        </div>
      )}
    </div>
  );
}

function StreamingMessage({ text, tools }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: '#484d5a', marginBottom: '4px' }}>Claude</div>
      {tools.length > 0 && (
        <div style={{ background: '#0c0d15', border: '1px solid #1a1d2e', borderRadius: '6px', padding: '8px 12px', marginBottom: '6px', width: '100%' }}>
          {tools.map((t, i) => <ToolBlock key={i} tool={t} />)}
        </div>
      )}
      {text && (
        <div style={{ background: '#0d0e18', border: '1px solid #14162a', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', maxWidth: '90%', fontSize: '13px', lineHeight: 1.6, color: '#c8ccd8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}<span style={{ opacity: 0.5 }}>▊</span>
        </div>
      )}
      {!text && tools.length === 0 && (
        <div style={{ color: '#484d5a', fontSize: '12px' }}>생각 중...</div>
      )}
    </div>
  );
}

export default function Chat({ slug, projectId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState(() => localStorage.getItem('vibehack-username') || '');
  const [isRunning, setIsRunning] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamTools, setStreamTools] = useState([]);
  const streamBufferRef = useRef('');
  const streamToolsRef = useRef([]);
  const [editingName, setEditingName] = useState(!localStorage.getItem('vibehack-username'));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messagesContainerRef = useRef(null);

  const isAtBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const scrollToBottom = (force = false) => {
    if (force || isAtBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetch(`/api/sessions/${slug}/messages`)
      .then(r => r.json())
      .then(data => { setMessages(Array.isArray(data) ? data : []); });
    // Initialize running state from server to recover from dashboard restarts mid-run
    fetch(`/api/sessions/${slug}`)
      .then(r => r.json())
      .then(data => { setIsRunning(!!data.claudeRunning); })
      .catch(() => {});
  }, [slug]);

  useEffect(() => { scrollToBottom(true); }, [slug]);
  useEffect(() => { scrollToBottom(); }, [messages, streamText]);

  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/events/stream?projectId=${projectId}`);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'chat.start') {
          setIsRunning(true);
          setStreamText('');
          setStreamTools([]);
          streamBufferRef.current = '';
          streamToolsRef.current = [];
        } else if (event.type === 'chat.delta') {
          const newText = event.data?.text || '';
          streamBufferRef.current += newText;
          let i = 0;
          const interval = setInterval(() => {
            if (i >= newText.length) { clearInterval(interval); return; }
            setStreamText(prev => prev + newText[i++]);
          }, 8);
        } else if (event.type === 'chat.tool') {
          streamToolsRef.current = [...streamToolsRef.current, event.data];
          setStreamTools(streamToolsRef.current);
        } else if (event.type === 'chat.done') {
          const finalText = event.data?.text || streamBufferRef.current;
          const finalTools = streamToolsRef.current;
          // Small delay to let character animation finish
          setTimeout(() => {
            setIsRunning(false);
            setStreamText('');
            setStreamTools([]);
            if (finalText) {
              const newId = event.data?.messageId || `msg-${Date.now()}`;
              setMessages(prev => {
                if (prev.some(m => m.id === newId)) return prev;
                return [...prev, {
                  id: newId,
                  role: 'assistant',
                  content: { text: finalText, tools: finalTools },
                  username: 'Claude',
                  source: 'system',
                }];
              });
            }
          }, 200);
        } else if (event.type === 'chat.error') {
          setIsRunning(false);
          setStreamText('');
          setStreamTools([]);
        }
      } catch {}
    };
    return () => es.close();
  }, [slug, projectId]);

  const saveUsername = (name) => {
    setUsername(name);
    localStorage.setItem('vibehack-username', name);
    setEditingName(false);
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || isRunning) return;
    setInput('');

    // Optimistic user message
    setMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: msg,
      username: username || '익명',
      source: 'web',
    }]);

    const res = await fetch(`/api/sessions/${slug}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, username: username || '익명', source: 'web' }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || '오류가 발생했습니다');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#08090e' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #14162a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: '#484d5a', fontWeight: 600 }}>채팅</span>
        {editingName ? (
          <form onSubmit={e => { e.preventDefault(); saveUsername(username); }} style={{ display: 'flex', gap: '6px' }}>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="닉네임 입력..."
              style={{ background: '#0c0d15', border: '1px solid #1a1d2e', borderRadius: '5px', color: '#e8eaf0', fontSize: '12px', padding: '4px 8px', width: '110px', outline: 'none' }}
            />
            <button type="submit" style={{ background: '#5b8af5', border: 'none', color: '#fff', borderRadius: '5px', fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>저장</button>
          </form>
        ) : (
          <button onClick={() => setEditingName(true)} style={{ background: 'none', border: '1px solid #1a1d2e', color: '#484d5a', borderRadius: '5px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}>
            {username || '익명'} ✏️
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {messages.length === 0 && !isRunning && (
          <div style={{ textAlign: 'center', color: '#252838', fontSize: '13px', marginTop: '40px' }}>
            무엇을 만들고 싶으신가요?<br />
            <span style={{ fontSize: '11px' }}>아이디어를 입력하면 Claude가 앱을 만들어드립니다</span>
          </div>
        )}
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {isRunning && <StreamingMessage text={streamText} tools={streamTools} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #14162a', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', background: '#0c0d15', border: '1px solid #1a1d2e', borderRadius: '10px', padding: '8px 12px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isRunning ? 'Claude가 작업 중...' : '메시지 입력... (Shift+Enter 줄바꿈)'}
            disabled={isRunning}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e8eaf0', fontSize: '13px',
              resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, overflow: 'hidden', minHeight: '22px',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isRunning || !input.trim()}
            style={{
              background: isRunning || !input.trim() ? '#1a1d2e' : '#5b8af5',
              border: 'none', color: '#fff', borderRadius: '7px', padding: '6px 14px',
              cursor: isRunning || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: 600, alignSelf: 'flex-end', flexShrink: 0,
              opacity: isRunning ? 0.5 : 1, transition: 'all 0.15s',
            }}
          >
            {isRunning ? '...' : '전송'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
