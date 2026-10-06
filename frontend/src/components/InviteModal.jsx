import React, { useState } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { X, Copy, Check, Share2, Link as LinkIcon, UserCheck, Shield } from 'lucide-react';

export default function InviteModal({ isOpen, onClose }) {
  const { activeGroup, refreshActiveGroupData } = useGroup();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [linkingId, setLinkingId] = useState(null);
  const [msg, setMsg] = useState('');

  if (!isOpen || !activeGroup) return null;

  const inviteUrl = `${window.location.origin}/join/${activeGroup._id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLinkAccount = async (memberId) => {
    if (!user) return;
    try {
      setLinkingId(memberId);
      setMsg('');
      await api.joinGroup(activeGroup._id, { memberId });
      await refreshActiveGroupData();
      setMsg('Account linked successfully!');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLinkingId(null);
    }
  };

  const members = activeGroup.members || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={20} color="var(--primary)" /> Invite & link members
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {msg && (
          <div style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            marginBottom: '14px',
            fontWeight: '600'
          }}>
            {msg}
          </div>
        )}

        {/* Share link input */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Shareable group link</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              className="form-input"
              value={inviteUrl}
              style={{ fontSize: '0.82rem', background: 'var(--bg)' }}
            />
            <button
              id="copy-invite-link-btn"
              onClick={handleCopy}
              className="btn btn-primary"
              style={{ padding: '8px 14px' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Anyone with this link can join <strong>{activeGroup.name}</strong>
          </span>
        </div>

        {/* Member account status */}
        <div>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
            Member accounts ({members.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {members.map((m) => {
              const isLinked = Boolean(m.userId);
              const isCurrentUser = user && String(m.userId) === String(user.id);
              const canLink = user && !isLinked;

              return (
                <div
                  key={m._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    fontSize: '0.86rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600' }}>{m.name}</span>
                    {isCurrentUser && (
                      <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>You</span>
                    )}
                  </div>

                  <div>
                    {isLinked ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.76rem', fontWeight: '600' }}>
                        <UserCheck size={14} /> Linked
                      </span>
                    ) : canLink ? (
                      <button
                        onClick={() => handleLinkAccount(m._id)}
                        disabled={linkingId === m._id}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                      >
                        <LinkIcon size={12} /> Link this to me
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                        Unlinked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
