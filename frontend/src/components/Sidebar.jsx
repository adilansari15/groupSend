import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useGroup } from '../context/GroupContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import InviteModal from './InviteModal.jsx';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Users,
  ArrowRightLeft,
  PlusCircle,
  Plus,
  Users2,
  Share2,
  LogIn,
  LogOut,
  User,
  MessageSquare,
  Activity as ActivityIcon
} from 'lucide-react';

export default function Sidebar() {
  const {
    groups,
    activeGroup,
    setActiveGroup,
    setCreateGroupModalOpen,
    setAddExpenseModalOpen
  } = useGroup();

  const { user, openAuthModal, logout } = useAuth();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', padding: '0 6px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #1f8a7a 0%, #176f62 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 12px var(--primary-glow)'
        }}>
          <Users2 size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.1 }}>GroupSpend</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shared Expenses</span>
        </div>
      </div>

      {/* User Session Bar */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: '600', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Signed in</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--text-muted)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Guest mode</span>
          </div>
        )}

        {user ? (
          <button
            id="sidebar-logout-btn"
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', border: 'none' }}
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        ) : (
          <button
            id="sidebar-login-btn"
            onClick={() => openAuthModal('login')}
            className="btn btn-outline btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          >
            <LogIn size={13} /> Log in
          </button>
        )}
      </div>

      {/* Group Selector */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
            Active group
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {activeGroup && (
              <button
                id="sidebar-invite-btn"
                onClick={() => setInviteModalOpen(true)}
                className="btn btn-sm btn-secondary"
                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                title="Invite to group"
              >
                <Share2 size={13} />
              </button>
            )}
            <button
              id="create-group-btn"
              onClick={() => setCreateGroupModalOpen(true)}
              className="btn btn-sm btn-outline"
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              title="Create group"
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        {groups.length > 0 ? (
          <div>
            <select
              id="active-group-select"
              className="form-select"
              value={activeGroup?._id || ''}
              onChange={(e) => {
                const selected = groups.find((g) => g._id === e.target.value);
                if (selected) setActiveGroup(selected);
              }}
              style={{ fontWeight: '600' }}
            >
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name} ({g.members?.length || 0} members)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button
            id="empty-create-group-btn"
            onClick={() => setCreateGroupModalOpen(true)}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Create your first group
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <NavLink
          to="/"
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', border: 'none' }}
        >
          <LayoutDashboard size={18} /> Home
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', border: 'none' }}
        >
          <Receipt size={18} /> Expenses
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', border: 'none' }}
        >
          <PieChart size={18} /> Reports
        </NavLink>

        <NavLink
          to="/members"
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', border: 'none' }}
        >
          <Users size={18} /> Members
        </NavLink>

        <NavLink
          to="/settlements"
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', border: 'none' }}
        >
          <ArrowRightLeft size={18} /> Settlements
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', border: 'none' }}
        >
          <MessageSquare size={18} /> Chat
        </NavLink>

        <NavLink
          to="/activity"
          className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{ justifyContent: 'flex-start', border: 'none' }}
        >
          <ActivityIcon size={18} /> Activity
        </NavLink>
      </nav>

      {/* Add Expense Action */}
      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <button
          id="sidebar-add-expense-btn"
          onClick={() => setAddExpenseModalOpen(true)}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px 16px' }}
          disabled={!activeGroup || (activeGroup.members?.length || 0) < 2}
        >
          <PlusCircle size={18} /> Add expense
        </button>
      </div>

      <InviteModal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </aside>
  );
}
