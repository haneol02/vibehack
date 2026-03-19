import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function MarkdownContent({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match) {
            return (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: '8px 0', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', maxWidth: '100%' }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }
          if (!inline) {
            return (
              <pre style={{ background: 'var(--code-bg)', borderRadius: '6px', padding: '8px 12px', margin: '8px 0', fontSize: '12px', overflowX: 'auto', maxWidth: '100%' }}>
                <code style={{ fontFamily: 'monospace' }} {...props}>{children}</code>
              </pre>
            );
          }
          return (
            <code style={{ background: 'var(--code-bg)', padding: '1px 5px', borderRadius: '3px', fontSize: '12px', fontFamily: 'monospace' }} {...props}>
              {children}
            </code>
          );
        },
        pre({ children }) { return <>{children}</>; },
        p({ children }) { return <p style={{ margin: '4px 0' }}>{children}</p>; },
        ul({ children }) { return <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ul>; },
        ol({ children }) { return <ol style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ol>; },
        li({ children }) { return <li style={{ margin: '2px 0' }}>{children}</li>; },
        h1({ children }) { return <h1 style={{ fontSize: '16px', margin: '8px 0 4px', fontWeight: 700 }}>{children}</h1>; },
        h2({ children }) { return <h2 style={{ fontSize: '14px', margin: '8px 0 4px', fontWeight: 700 }}>{children}</h2>; },
        h3({ children }) { return <h3 style={{ fontSize: '13px', margin: '6px 0 4px', fontWeight: 700 }}>{children}</h3>; },
        blockquote({ children }) {
          return <blockquote style={{ borderLeft: '3px solid var(--blockquote-border)', margin: '4px 0', paddingLeft: '10px', color: 'var(--text-tertiary)' }}>{children}</blockquote>;
        },
        a({ href, children }) {
          return <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{children}</a>;
        },
        hr() { return <hr style={{ border: 'none', borderTop: '1px solid var(--border-secondary)', margin: '8px 0' }} />; },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function SourceIcon({ source }) {
  if (source === 'discord') {
    return <span style={{ fontSize: '10px', background: 'var(--discord-bg)', color: '#fff', borderRadius: '3px', padding: '1px 5px', marginLeft: '6px' }}>Discord</span>;
  }
  return null;
}

function ToolBlock({ tool }) {
  return (
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 0', fontFamily: 'monospace' }}>
      {tool.label}
    </div>
  );
}

function Message({ msg }) {
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
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>{isUser ? (msg.username || '사용자') : 'Claude'}</span>
        {msg.source && <SourceIcon source={msg.source} />}
      </div>

      {!isUser && tools.length > 0 && (
        <div style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-secondary)',
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
          background: isUser ? 'var(--user-bubble-bg)' : 'var(--bg-elevated)',
          border: `1px solid ${isUser ? 'var(--user-bubble-border)' : 'var(--border-primary)'}`,
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          padding: '10px 14px',
          maxWidth: '90%',
          minWidth: 0,
          overflow: 'hidden',
          fontSize: '13px',
          lineHeight: 1.6,
          color: isUser ? 'var(--user-bubble-text)' : 'var(--text-secondary)',
          wordBreak: 'break-word',
        }}>
          {isUser ? <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span> : <MarkdownContent>{content}</MarkdownContent>}
        </div>
      )}
    </div>
  );
}

function StreamingMessage({ text, tools }) {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 600);
    return () => clearInterval(t);
  }, []);

  const latestTool = tools.length > 0 ? tools[tools.length - 1] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '12px' }}>
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'var(--accent)',
          opacity: pulse ? 1 : 0.3,
          transition: 'opacity 0.3s',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>Claude 작업 중</span>
        {tools.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {tools.length}개 작업</span>
        )}
      </div>

      {/* Current tool */}
      {latestTool && (
        <div style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--input-border-active)',
          borderRadius: '6px',
          padding: '6px 12px',
          marginBottom: '6px',
          width: '100%',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ opacity: pulse ? 1 : 0.5, transition: 'opacity 0.3s' }}>⚙</span>
          {latestTool.label}
        </div>
      )}

      {/* Streaming text */}
      {text ? (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
          borderRadius: '12px 12px 12px 4px', padding: '10px 14px',
          maxWidth: '90%', minWidth: 0, overflow: 'hidden', fontSize: '13px', lineHeight: 1.6,
          color: 'var(--text-secondary)', wordBreak: 'break-word',
        }}>
          <MarkdownContent>{text}</MarkdownContent><span style={{ opacity: 0.5 }}>▊</span>
        </div>
      ) : !latestTool && (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>생각 중...</div>
      )}
    </div>
  );
}

export default function Chat({ slug, projectId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState(() => localStorage.getItem('vibehack-username') || '');
  const [isRunning, setIsRunning] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('vibehack-model') || '');
  const [streamText, setStreamText] = useState('');
  const [streamTools, setStreamTools] = useState([]);
  const streamBufferRef = useRef('');
  const streamToolsRef = useRef([]);
  const userScrolledUpRef = useRef(false);
  const [editingName, setEditingName] = useState(!localStorage.getItem('vibehack-username'));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = (force = false) => {
    if (force || !userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Track user scroll intent
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch(`/api/sessions/${slug}/messages`)
      .then(r => r.json())
      .then(data => { setMessages(Array.isArray(data) ? data : []); });
    fetch(`/api/sessions/${slug}`)
      .then(r => r.json())
      .then(data => { setIsRunning(!!data.claudeRunning); })
      .catch(() => {});
  }, [slug]);

  // Poll running state every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/sessions/${slug}`)
        .then(r => r.json())
        .then(data => {
          const serverRunning = !!data.claudeRunning;
          setIsRunning(prev => {
            if (prev !== serverRunning) return serverRunning;
            return prev;
          });
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [slug]);

  useEffect(() => { userScrolledUpRef.current = false; scrollToBottom(true); }, [slug]);
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
          userScrolledUpRef.current = false;
          scrollToBottom(true);
          if (event.data?.messageId && event.data?.message) {
            const newMsg = {
              id: event.data.messageId,
              role: 'user',
              content: event.data.message,
              username: event.data.username || '사용자',
              source: event.data.source || 'web',
            };
            setMessages(prev => {
              if (prev.some(m => m.id === event.data.messageId)) return prev;
              const tmpIdx = prev.findIndex(m => m.id.startsWith('tmp-') && m.content === event.data.message);
              if (tmpIdx !== -1) {
                const next = [...prev];
                next[tmpIdx] = newMsg;
                return next;
              }
              return [...prev, newMsg];
            });
          }
        } else if (event.type === 'chat.delta') {
          streamBufferRef.current += (event.data?.text || '');
          setStreamText(streamBufferRef.current);
        } else if (event.type === 'chat.tool') {
          streamToolsRef.current = [...streamToolsRef.current, event.data];
          setStreamTools(streamToolsRef.current);
        } else if (event.type === 'chat.done') {
          const finalText = event.data?.text || streamBufferRef.current;
          const finalTools = streamToolsRef.current;
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
    if (inputRef.current) inputRef.current.style.height = 'auto';

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
      body: JSON.stringify({ message: msg, username: username || '익명', source: 'web', model: model || undefined }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || '오류가 발생했습니다');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRunning && (
            <span style={{ fontSize: '10px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: '4px', padding: '2px 6px' }}>
              Claude 작업 중
            </span>
          )}
          {messages.length > 0 && !isRunning && (
            <button
              onClick={() => setMessages([])}
              style={{ background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: '4px', fontSize: '10px', padding: '2px 8px', cursor: 'pointer' }}
            >채팅 지우기</button>
          )}
        </div>
        {editingName ? (
          <form onSubmit={e => { e.preventDefault(); saveUsername(username); }} style={{ display: 'flex', gap: '6px' }}>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="닉네임 입력..."
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', borderRadius: '5px', color: 'var(--text-primary)', fontSize: '12px', padding: '4px 8px', width: '110px', outline: 'none' }}
            />
            <button type="submit" style={{ background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: '5px', fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>저장</button>
          </form>
        ) : (
          <button onClick={() => setEditingName(true)} style={{ background: 'none', border: '1px solid var(--border-secondary)', color: 'var(--text-muted)', borderRadius: '5px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}>
            {username || '익명'} ✏️
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {messages.length === 0 && !isRunning && (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px', marginTop: '40px' }}>
            무엇을 만들고 싶으신가요?<br />
            <span style={{ fontSize: '11px' }}>아이디어를 입력하면 Claude가 앱을 만들어드립니다</span>
          </div>
        )}
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {isRunning && <StreamingMessage text={streamText} tools={streamTools} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-primary)', flexShrink: 0 }}>
        {/* Model selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dimmed)' }}>모델</span>
          {[
            { value: '', label: 'Default' },
            { value: 'claude-haiku-4-5-20251001', label: 'Haiku' },
            { value: 'claude-sonnet-4-6', label: 'Sonnet' },
            { value: 'claude-opus-4-6', label: 'Opus' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setModel(opt.value); localStorage.setItem('vibehack-model', opt.value); }}
              style={{
                background: model === opt.value ? 'var(--accent-hover)' : 'none',
                border: `1px solid ${model === opt.value ? 'var(--accent)' : 'var(--border-secondary)'}`,
                color: model === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                borderRadius: '4px', fontSize: '10px', padding: '2px 8px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', border: `1px solid ${isRunning ? 'var(--input-border-active)' : 'var(--border-secondary)'}`, borderRadius: '10px', padding: '8px 12px', transition: 'border-color 0.2s' }}>
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
              flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px',
              resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, overflow: 'hidden', minHeight: '22px',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isRunning || !input.trim()}
            style={{
              background: isRunning || !input.trim() ? 'var(--btn-disabled-bg)' : 'var(--accent)',
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
