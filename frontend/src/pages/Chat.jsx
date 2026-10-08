import React, { useState, useEffect, useRef } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { MessageSquare, Send, Users, ShieldCheck, Sparkles } from 'lucide-react';
import SEO from '../components/SEO.jsx';

export default function Chat() {
  const { activeGroup, socket } = useGroup();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!activeGroup?._id) return;

    let isMounted = true;
    async function fetchChatHistory() {
      try {
        setLoading(true);
        const data = await api.getChat(activeGroup._id);
        if (isMounted) {
          setMessages(data || []);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchChatHistory();

    return () => {
      isMounted = false;
    };
  }, [activeGroup?._id]);

  // Real-time socket message reception
  useEffect(() => {
    if (!socket || !activeGroup?._id) return;

    const handleNewMessage = (newMsg) => {
      if (String(newMsg.groupId) === String(activeGroup._id)) {
        setMessages((prev) => {
          // Avoid duplicate by id
          if (prev.some((m) => String(m._id) === String(newMsg._id))) {
            return prev;
          }
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, activeGroup?._id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeGroup?._id || !user) return;

    try {
      setSending(true);
      setInputText('');

      // Send via socket for instant broadcast, with REST fallback
      if (socket && socket.connected) {
        socket.emit('send-message', {
          groupId: activeGroup._id,
          message: text
        });
      } else {
        const saved = await api.sendChatMessage(activeGroup._id, text);
        setMessages((prev) => [...prev, saved]);
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please log in to access group chat.</p>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Please select or create a group to access chat.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 160px)',
      minHeight: '480px',
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <SEO title="Chat" canonicalPath="/chat" />
      {/* Chat Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>
              {activeGroup.name} Chat
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {activeGroup.members?.length || 0} members • Real-time active
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.78rem',
          color: 'var(--success)',
          background: 'var(--success-light)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontWeight: '600'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
          Live
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto', maxWidth: '320px' }}>
            <Sparkles size={32} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
              Start the conversation
            </p>
            <span style={{ fontSize: '0.84rem' }}>
              Coordinate dinner plans, split receipts, or discuss group expenses here.
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user && String(msg.senderId) === String(user.id || user._id);

            if (msg.isSystem) {
              return (
                <div key={msg._id} style={{ textAlign: 'center', margin: '6px 0' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-muted)',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)'
                  }}>
                    {msg.message}
                  </span>
                </div>
              );
            }

            const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={msg._id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                {!isMe && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '3px', marginLeft: '6px' }}>
                    {msg.senderName}
                  </span>
                )}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMe ? 'var(--primary)' : 'var(--bg)',
                    color: isMe ? '#ffffff' : 'var(--text-main)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    fontSize: '0.9rem',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {msg.message}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px', padding: '0 4px' }}>
                  {formattedTime}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '12px 16px',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <input
          id="chat-message-input"
          type="text"
          className="form-input"
          placeholder={`Message ${activeGroup.name}...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending || !user}
          style={{ flex: 1, padding: '10px 14px' }}
        />
        <button
          type="submit"
          id="chat-send-btn"
          className="btn btn-primary"
          disabled={sending || !inputText.trim() || !user}
          style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}
