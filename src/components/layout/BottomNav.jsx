import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  UserCheck,
  Activity,
  Users,
  Briefcase,
  Globe
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function BottomNav() {
  const { isSuperAdmin } = useAuthStore();

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    textDecoration: 'none',
    color: isActive
      ? 'var(--color-brand)'
      : 'var(--color-text-secondary)',
    fontSize: '11px',
    fontWeight: isActive ? 600 : 500,
    minWidth: '68px',
    flexShrink: 0,
    padding: '6px 8px',
    borderRadius: '8px',
    backgroundColor: isActive ? 'rgba(30, 64, 175, 0.08)' : 'transparent',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap'
  });

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--bottomnav-height, 62px)',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--color-border)',
        display: 'none',
        alignItems: 'center',
        justifyContent: isSuperAdmin() ? 'flex-start' : 'space-around',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        padding: '0 8px',
        gap: '4px',
        zIndex: 100,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.06)'
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

          <NavLink to="/admin/careers" style={linkStyle}>
            <Briefcase size={20} />
            <span>Careers</span>
          </NavLink>

          <NavLink to="/admin/portfolio" style={linkStyle}>
            <Globe size={20} />
            <span>Website Projects - CMS</span>
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