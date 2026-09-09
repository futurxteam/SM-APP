import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Building2, Menu } from 'lucide-react';

export default function Navbar({ title, onMenuToggle }) {
  const { user } = useAuthStore();

  return (
    <header style={{
      height: 'var(--topbar-height)',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-4)',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onMenuToggle}
          className="mobile-hamburger-btn"
          aria-label="Toggle navigation menu"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-primary)'
          }}
        >
          <Menu size={20} />
        </button>

        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title || 'Site & Project Management System'}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: '#F1F5F9',
          fontSize: '12px',
          fontWeight: 600,
          color: '#334155'
        }}>
          <Building2 size={14} color="var(--color-brand)" />
          <span>Hygge Architects</span>
        </div>

        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-brand)',
          color: '#FFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
}
