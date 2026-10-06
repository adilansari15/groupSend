import React, { useState, useEffect } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { api } from '../api.js';
import { X, Plus, Users, Trash2 } from 'lucide-react';

export default function CreateGroupModal() {
  const {
    createGroupModalOpen,
    setCreateGroupModalOpen,
    fetchGroups,
    setActiveGroup
  } = useGroup();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState(['Aditya Pandey', 'Arunkumar Chaudhary', 'Rohan Verma', 'Ayush Singh']);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && createGroupModalOpen) {
        setCreateGroupModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createGroupModalOpen, setCreateGroupModalOpen]);

  if (!createGroupModalOpen) return null;

  const handleAddMember = (e) => {
    e?.preventDefault();
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (members.includes(trimmed)) {
      setError('Member name already added');
      return;
    }
    setMembers([...members, trimmed]);
    setMemberInput('');
    setError('');
  };

  const handleRemoveMember = (idxToRemove) => {
    setMembers(members.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (members.length < 2) {
      setError('Add at least 2 members to share expenses');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const newGroup = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        members: members
      });

      await fetchGroups();
      setActiveGroup(newGroup);
      setCreateGroupModalOpen(false);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setCreateGroupModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.28rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--primary)" /> Create new group
          </h2>
          <button
            onClick={() => setCreateGroupModalOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="group-name-input">
              Group name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="group-name-input"
              className="form-input"
              type="text"
              placeholder="e.g. Hostel Group, Goa Trip 2026"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="group-desc-input">Description (optional)</label>
            <input
              id="group-desc-input"
              className="form-input"
              type="text"
              placeholder="e.g. Shared expenses for roommates"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Add members</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="member-input"
                className="form-input"
                type="text"
                placeholder="Enter member name"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
              />
              <button
                type="button"
                id="add-member-chip-btn"
                className="btn btn-secondary"
                onClick={handleAddMember}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Member chips list */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>
              Members ({members.length})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {members.map((m, idx) => (
                <span
                  key={idx}
                  className="badge badge-teal"
                  style={{ padding: '6px 10px', fontSize: '0.82rem', gap: '8px' }}
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}
                    title={`Remove ${m}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateGroupModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-group-btn"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
