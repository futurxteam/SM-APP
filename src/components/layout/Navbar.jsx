import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Building2, LogOut, User as UserIcon, Shield, ChevronDown, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import AppUpdater from '../../services/appUpdater';

export default function Navbar({ title }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      await AppUpdater.check(true);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'project_manager': return 'Project Manager';
      case 'site_supervisor': return 'Site Supervisor';
      case 'accounts': return 'Accounts & Finance';
      default: return role ? role.replace('_', ' ') : 'User';
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          {title || 'Site & Project Management'}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {user?.role === 'site_supervisor' && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hygge:open-location-declaration'));
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1D4ED8',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            title="Declare Site GPS Location"
          >
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2563EB', animation: 'pulse 2s infinite' }} />
            <span>Check-in</span>
          </button>
        )}

        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: '#F1F5F9',
          fontSize: '12px',
          fontWeight: 600,
          color: '#334155'
        }} className="desktop-brand-pill">
          <Building2 size={14} color="var(--color-brand)" />
          <span>Hygge Architects</span>
        </div>

        {/* User Profile Avatar with Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen((prev) => !prev);
            }}
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              minHeight: '36px',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              backgroundColor: 'var(--color-brand)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              border: dropdownOpen ? '2px solid var(--color-brand)' : '2px solid #E2E8F0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              padding: 0,
              outline: 'none',
              flexShrink: 0,
              transition: 'transform 0.15s ease, border-color 0.15s ease',
              transform: dropdownOpen ? 'scale(1.05)' : 'scale(1)',
            }}
            aria-label="User profile and logout menu"
            title={user?.name ? `${user.name} (${getRoleLabel(user?.role)})` : 'User Account'}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--color-border)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'scaleUpCard 0.15s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* User Details Header */}
              <div style={{
                padding: '14px 16px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  minWidth: '38px',
                  minHeight: '38px',
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-brand)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '15px',
                  flexShrink: 0,
                }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {user?.name || 'User'}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '1px'
                  }}>
                    {user?.email || ''}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#EFF6FF',
                    color: 'var(--color-brand)',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}>
                    {getRoleLabel(user?.role)}
                  </div>
                </div>
              </div>

              {/* Menu Actions */}
              <div style={{ padding: '6px' }}>
                {Capacitor.isNativePlatform() && (
                  <>
                    <button
                      type="button"
                      onClick={handleCheckUpdate}
                      disabled={checkingUpdate}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#334155',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: checkingUpdate ? 'wait' : 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease',
                        marginBottom: '2px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <RefreshCw
                        size={15}
                        color="#475569"
                        style={{
                          animation: checkingUpdate ? 'spin 1s linear infinite' : 'none',
                        }}
                      />
                      <span>{checkingUpdate ? 'Checking Updates...' : 'Check for Updates'}</span>
                    </button>

                    <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                  </>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#DC2626',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={15} color="#DC2626" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
