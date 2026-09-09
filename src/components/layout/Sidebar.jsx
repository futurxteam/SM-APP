import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  UserCheck, 
  Activity, 
  LogOut, 
  Building2,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose }) {
  const { user, logout, isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate('/login');
  };

  const handleLinkClick = () => {
    onClose?.();
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    project_manager: 'Project Manager',
    site_supervisor: 'Site Supervisor',
    accounts: 'Accounts & Finance',
  };

  return (
    <aside className={`sidebar-drawer ${isOpen ? 'mobile-open' : ''}`}>
      {/* Brand Logo Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1E4080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: 'var(--color-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontWeight: 700
          }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#FFF', letterSpacing: '-0.02em' }}>
              HYGGE
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-sidebar-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Architects & Interiors
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="sidebar-close-btn"
          aria-label="Close sidebar"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#93C5FD',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* User Info Capsule */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1E4080',
        backgroundColor: 'rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>{user?.name || 'User'}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-sidebar-text)' }}>
          {roleLabels[user?.role] || user?.role}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        <NavLink 
          to="/dashboard" 
          onClick={handleLinkClick}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
            backgroundColor: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
            transition: 'all 0.15s ease',
          })}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/projects" 
          onClick={handleLinkClick}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
            backgroundColor: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
            transition: 'all 0.15s ease',
          })}
        >
          <FolderKanban size={18} />
          <span>Projects</span>
        </NavLink>

        <NavLink 
          to="/workers" 
          onClick={handleLinkClick}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
            backgroundColor: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
            transition: 'all 0.15s ease',
          })}
        >
          <UserCheck size={18} />
          <span>Worker Master</span>
        </NavLink>

        {isSuperAdmin() && (
          <>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: 'var(--color-sidebar-text)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              marginTop: '16px',
              paddingLeft: '14px',
              marginBottom: '4px' 
            }}>
              Administration
            </div>

            <NavLink 
              to="/admin/users" 
              onClick={handleLinkClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
                backgroundColor: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
              })}
            >
              <Users size={18} />
              <span>User Accounts</span>
            </NavLink>

            <NavLink 
              to="/admin/activity-log" 
              onClick={handleLinkClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--color-sidebar-text-active)' : 'var(--color-sidebar-text)',
                backgroundColor: isActive ? 'var(--color-sidebar-active-bg)' : 'transparent',
              })}
            >
              <Activity size={18} />
              <span>Activity Feed</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout Footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #1E4080' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: 'transparent',
            color: '#FCA5A5',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
