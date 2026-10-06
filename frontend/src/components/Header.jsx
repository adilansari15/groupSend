import React, { useState } from 'react';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import InviteModal from './InviteModal.jsx';
import { PlusCircle, Plus, Share2, LogIn, LogOut, Sun, Moon, Bell } from 'lucide-react';

export default function Header() {
  const {
    activeGroup,
    setCreateGroupModalOpen,
    setAddExpenseModalOpen,
    liveNotification
  } = useGroup();

  const { user, openAuthModal, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <header style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--border)'
    }}>
      {/* Live Activity Toast Banner */}
      {liveNotification && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(31, 138, 122, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
          border: '1px solid var(--primary)',
          color: 'var(--text-main)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: '600',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <Bell size={16} color="var(--primary)" />
          <span>{liveNotification}</span>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Title & Group Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeGroup?.name || 'No group selected'}
              {activeGroup && (
                <span className="badge badge-teal" style={{ fontSize: '0.8rem', verticalAlign: 'middle' }}>
                  {activeGroup.members?.length || 0} members
                </span>
              )}
            </h1>
            {activeGroup?.description && (
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {activeGroup.description}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons, Theme & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Theme toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} color="var(--warning)" /> : <Moon size={15} />}
          </button>

          {activeGroup && (
            <button
              id="header-invite-btn"
              onClick={() => setInviteModalOpen(true)}
              className="btn btn-secondary btn-sm"
              title="Invite link & member accounts"
            >
              <Share2 size={15} /> Invite
            </button>
          )}

          <button
            id="header-create-group-btn"
            onClick={() => setCreateGroupModalOpen(true)}
            className="btn btn-secondary btn-sm"
            title="Create new group"
          >
            <Plus size={15} /> New group
          </button>

          <button
            id="header-add-expense-btn"
            onClick={() => setAddExpenseModalOpen(true)}
            className="btn btn-primary btn-sm"
            disabled={!activeGroup || (activeGroup.members?.length || 0) < 2}
          >
            <PlusCircle size={15} /> Add expense
          </button>

          {user && !user.isVerified && (
            <button
              id="header-verify-email-btn"
              onClick={() => openAuthModal('verify')}
              className="btn btn-sm"
              style={{
                padding: '6px 10px',
                fontSize: '0.78rem',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--warning)',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}
              title="Click to verify your email address"
            >
              Verify email
            </button>
          )}

          {user ? (
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              title={`Logged in as ${user.name}`}
            >
              <LogOut size={14} /> Log out
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="btn btn-outline btn-sm"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            >
              <LogIn size={14} /> Log in
            </button>
          )}
        </div>
      </div>

      <InviteModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </header>
  );
}
