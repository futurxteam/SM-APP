import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import SupervisorLocationBanner from '../location/SupervisorLocationBanner';

export default function Layout({ pageTitle }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);

  useEffect(() => {
    const handleLoadingEvent = (e) => {
      setIsNetworkLoading(!!e.detail?.active);
    };

    window.addEventListener('hygge:loading', handleLoadingEvent);
    return () => {
      window.removeEventListener('hygge:loading', handleLoadingEvent);
    };
  }, []);

  return (
    <div className="layout-wrapper">
      {/* Global Top Loading Progress Bar */}
      {isNetworkLoading && (
        <div className="global-loading-bar-container" aria-label="Loading data">
          <div className="global-loading-bar" />
        </div>
      )}

      {/* Sidebar Drawer */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <div className="main-content">
        <SupervisorLocationBanner />
        <Navbar title={pageTitle} onMenuToggle={() => setMobileMenuOpen(prev => !prev)} />
        <main className="content-container">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
