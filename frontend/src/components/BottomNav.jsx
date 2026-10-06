import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, PieChart, Users, ArrowRightLeft } from 'lucide-react';

export default function BottomNav() {
  const navStyle = ({ isActive }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '0.72rem',
    fontWeight: isActive ? '700' : '500',
    padding: '6px 4px',
    flex: 1,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s ease'
  });

  return (
    <nav className="bottom-nav">
      <NavLink to="/" style={navStyle}>
        <LayoutDashboard size={20} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/expenses" style={navStyle}>
        <Receipt size={20} />
        <span>Expenses</span>
      </NavLink>
      <NavLink to="/reports" style={navStyle}>
        <PieChart size={20} />
        <span>Reports</span>
      </NavLink>
      <NavLink to="/members" style={navStyle}>
        <Users size={20} />
        <span>Members</span>
      </NavLink>
      <NavLink to="/settlements" style={navStyle}>
        <ArrowRightLeft size={20} />
        <span>Settlements</span>
      </NavLink>
    </nav>
  );
}
