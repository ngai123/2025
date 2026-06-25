import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Send, CornerDownRight } from 'lucide-react';
import chatService from '../../api/services/chatService';
import { AgentResponseRenderer } from '../SignUp/AgentResponseDisplay';

// Helper function to format AI response with basic markdown support
const formatAIResponse = (text) => {
  if (!text) return null;

  // Split by lines to handle formatting
  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, lineIndex) => {
    // Process bold text (**text**)
    const parts = [];
    let remaining = line;
    let partIndex = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);

      if (boldMatch) {
        const beforeBold = remaining.substring(0, boldMatch.index);
        if (beforeBold) {
          parts.push(<span key={`${lineIndex}-${partIndex++}`}>{beforeBold}</span>);
        }
        parts.push(
          <strong key={`${lineIndex}-${partIndex++}`} style={{ fontWeight: 600 }}>
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      } else {
        if (remaining) {
          parts.push(<span key={`${lineIndex}-${partIndex++}`}>{remaining}</span>);
        }
        break;
      }
    }

    // Check if line is a numbered list item
    const listMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (listMatch) {
      elements.push(
        <div key={lineIndex} style={{ marginLeft: 8, marginTop: 4, display: 'flex', gap: 6 }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 600, minWidth: 16 }}>{listMatch[1]}.</span>
          <span style={{ flex: 1 }}>{parts.length > 0 ? parts : listMatch[2]}</span>
        </div>
      );
    } else if (line.trim() === '') {
      // Empty line - add spacing
      elements.push(<div key={lineIndex} style={{ height: 8 }} />);
    } else {
      // Regular line
      elements.push(
        <div key={lineIndex} style={{ marginTop: lineIndex > 0 ? 2 : 0 }}>
          {parts.length > 0 ? parts : line}
        </div>
      );
    }
  });

  return <>{elements}</>;
};

const AIChat = ({ open, onClose, sessionId, currentUserId, onInsert }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (open) setDismissed(false);
    const load = async () => {
      if (!open) return;
      console.log('[AIChat] open', { sessionId, currentUserId });
      try {
        const mem = await chatService.getAIMemory(sessionId);
        const turns = Array.isArray(mem?.recent_turns) ? mem.recent_turns : [];
        console.log('[AIChat] memory loaded', { turnsCount: turns.length });
        if (turns.length > 0) {
          // Reverse the turns since backend returns newest first (desc order)
          const orderedTurns = [...turns].reverse();
          setMessages(orderedTurns.map(t => ({ role: t.role, content: t.content })));
        } else {
          setMessages([{ role: 'assistant', content: "Hi! I'm Aura AI, your dating coach. I can see your conversation and help you craft the perfect response. What do you need help with?" }]);
        }
      } catch (e) {
        console.warn('[AIChat] memory load failed', e);
        setMessages([{ role: 'assistant', content: "I'm ready." }]);
      } finally {
        setTimeout(() => {
          inputRef.current && inputRef.current.focus();
        }, 100);
      }
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const limitInput = (text) => {
    if (text.length <= 400) return text;
    return text.slice(0, 400);
  };

  const limitReply = (text) => {
    if (!text) return '';
    if (text.length <= 2000) return text;
    const truncated = text.slice(0, 2000);
    const cut = truncated.lastIndexOf(' ');
    return cut > 0 ? truncated.slice(0, cut) + '…' : truncated + '…';
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userText = limitInput(input.trim());
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setSending(true);
    setError(null);
    console.log('[AIChat] sending', { sessionId, currentUserId, promptLen: userText.length });
    try {
      const res = await chatService.aiChat(sessionId, currentUserId, userText);
      const reply = limitReply(res.reply || '');
      if (!res?.reply) console.warn('[AIChat] empty reply received');
      if (reply.includes('Coach is busy') || res.reply === 'Saya perlukan sedikit masa, cuba lagi nanti.') {
        console.warn('[AIChat] AI fallback or busy state detected');
      }
      console.log('[AIChat] reply received', { replyLen: (res.reply || '').length, agentType: res.agent_type });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        agentType: res.agent_type,
        agentData: res.data
      }]);
    } catch (e) {
      console.error('[AIChat] send failed', e);
      setError('Coach is busy, try again');
    } finally {
      console.log('[AIChat] send complete');
      setSending(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const handleInsert = (text) => {
    onInsert && onInsert(text);
    onClose && onClose();
  };

  if (!open || dismissed) return null;

  const handleOverlayClick = () => {
    if (onClose) {
      onClose();
    } else {
      setDismissed(true);
    }
  };

  return (
    <div onClick={handleOverlayClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 430, background: 'var(--color-bg-secondary)', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', boxShadow: '0 -8px 24px rgba(0,0,0,0.2)', fontFamily: "'Josefin Sans', sans-serif", display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', position: 'relative' }}>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: 20,
              lineHeight: 1,
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={22} />
          </button>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Aura AI</div>
          </div>
          <div style={{ width: 22, visibility: 'hidden' }}></div>
        </div>
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', background: 'var(--color-bg-primary)' }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{ maxWidth: '85%', background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-secondary)', color: m.role === 'user' ? '#fff' : 'var(--color-text-primary)', borderRadius: 12, padding: '10px 12px', fontFamily: "'Josefin Sans', sans-serif", fontSize: 14 }}>
                <div>{m.role === 'assistant' ? formatAIResponse(m.content) : m.content}</div>
                {m.role === 'assistant' && idx !== 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => { console.log('[AIChat] copy clicked'); handleCopy(m.content); }} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <Copy size={16} />
                    </button>
                    <button onClick={() => { console.log('[AIChat] insert clicked'); handleInsert(m.content); }} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <CornerDownRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              {m.role === 'assistant' && m.agentType && (
                <div style={{ maxWidth: '85%', marginTop: 8 }}>
                  <AgentResponseRenderer
                    agentType={m.agentType}
                    agentData={m.agentData}
                  />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
              <div style={{ maxWidth: '85%', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', borderRadius: 12, padding: '10px 12px', fontFamily: "'Josefin Sans', sans-serif", fontSize: 14 }}>
                Understanding...
              </div>
            </div>
          )}
          {error && (
            <div style={{ background: '#FFE6E6', color: '#A85751', borderRadius: 8, padding: '8px 10px', fontFamily: "'Josefin Sans', sans-serif", fontSize: 13 }}>{error}</div>
          )}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid #E8DCC8', display: 'flex', gap: 8 }}>
          <button onClick={() => setInput(prev => prev ? `Rephrase politely: ${prev}` : prev)} style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 14, padding: '8px 10px', fontSize: 12, color: '#333', fontFamily: "'Josefin Sans', sans-serif" }}>Rephrase</button>
          <button onClick={() => setInput(prev => prev ? `Shorter: ${prev}` : prev)} style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 14, padding: '8px 10px', fontSize: 12, color: '#333', fontFamily: "'Josefin Sans', sans-serif" }}>Shorter</button>
          <button onClick={() => setInput(prev => prev ? `More playful: ${prev}` : prev)} style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 14, padding: '8px 10px', fontSize: 12, color: '#333', fontFamily: "'Josefin Sans', sans-serif" }}>Playful</button>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(limitInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask for advice, shopping lists, date locations, or schedule events..."
            style={{ flex: 1, background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: focused ? '1.5px solid #FF7F7F' : '1px solid #E8DCC8', outline: 'none', boxShadow: 'none', borderRadius: 24, padding: '12px 16px', fontFamily: "'Josefin Sans', sans-serif", fontSize: 15 }}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending} style={{ background: '#A85751', color: 'white', border: 'none', width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: !input.trim() || sending ? 0.6 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;