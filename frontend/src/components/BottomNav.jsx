import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Users, ArrowRightLeft, MessageSquare, Activity as ActivityIcon } from 'lucide-react';

export default function BottomNav() {
  const navStyle = ({ isActive }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '0.68rem',
    fontWeight: isActive ? '700' : '500',
    padding: '4px 2px',
    flex: 1,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s ease'
  });

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/" style={navStyle}>
        <LayoutDashboard size={18} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/expenses" style={navStyle}>
        <Receipt size={18} />
        <span>Expenses</span>
      </NavLink>
      <NavLink to="/members" style={navStyle}>
        <Users size={18} />
        <span>Members</span>
      </NavLink>
      <NavLink to="/settlements" style={navStyle}>
        <ArrowRightLeft size={18} />
        <span>Settle</span>
      </NavLink>
      <NavLink to="/chat" style={navStyle}>
        <MessageSquare size={18} />
        <span>Chat</span>
      </NavLink>
      <NavLink to="/activity" style={navStyle}>
        <ActivityIcon size={18} />
        <span>Activity</span>
      </NavLink>
    </nav>
  );
}
