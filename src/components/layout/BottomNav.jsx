import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  UserCheck,
  Activity,
  Users
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function BottomNav() {
  const { isSuperAdmin } = useAuthStore();

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    textDecoration: 'none',
    color: isActive
      ? 'var(--color-brand)'
      : 'var(--color-text-secondary)',
    fontSize: '11px',
    fontWeight: isActive ? 600 : 400
  });

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--bottomnav-height)',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--color-border)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}
      className="mobile-bottom-nav"
    >
      <NavLink to="/dashboard" style={linkStyle}>
        <LayoutDashboard size={20} />
        <span>Home</span>
      </NavLink>

      <NavLink to="/projects" style={linkStyle}>
        <FolderKanban size={20} />
        <span>Projects</span>
      </NavLink>

      <NavLink to="/workers" style={linkStyle}>
        <UserCheck size={20} />
        <span>Workers</span>
      </NavLink>

      {isSuperAdmin() && (
        <>
          <NavLink to="/admin/users" style={linkStyle}>
            <Users size={20} />
            <span>Users</span>
          </NavLink>

          <NavLink to="/admin/activity-log" style={linkStyle}>
            <Activity size={20} />
            <span>Feed</span>
          </NavLink>
        </>
      )}
    </nav>
  );
}