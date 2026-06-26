'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../AuthContext';


export default function Navbar() {
  const { user, logout } = useAuth();

  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const isAdmin = user && (user.email === 'admin@sdlc.com' || user.role === 'admin');
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isAssessmentPage = pathname === '/assessment';
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);


  useEffect(() => {
    if (!profileDropdownOpen) return;
    const closeDropdown = () => setProfileDropdownOpen(false);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, [profileDropdownOpen]);

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const getInitials = () => {
    if (!user) return '';
    if (user.name) {
      const parts = user.name.split(' ');
      return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const handleEditProfileClick = (e) => {
    setProfileDropdownOpen(false);
    if (pathname === '/dashboard') {
      window.dispatchEvent(new Event('switch-tab-profile'));
    }
  };

  const handleDashboardClick = (e, link) => {
    if (link.href === '/dashboard' && pathname === '/dashboard') {
      window.dispatchEvent(new Event('switch-tab-dashboard'));
    }
  };

  useEffect(() => {
    if (user || pathname !== '/') {
      setActiveSection('');
      return;
    }

    const handleScroll = () => {
      const scrollPos = window.scrollY + 120; // trigger offset
      
      const domainsEl = document.getElementById('domains');
      const maturityEl = document.getElementById('maturity');
      const aboutEl = document.getElementById('about');

      const getAbsoluteTop = (el) => {
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      };

      const aboutTop = getAbsoluteTop(aboutEl);
      const maturityTop = getAbsoluteTop(maturityEl);
      const domainsTop = getAbsoluteTop(domainsEl);

      if (aboutEl && scrollPos >= aboutTop) {
        setActiveSection('about');
      } else if (maturityEl && scrollPos >= maturityTop) {
        setActiveSection('maturity');
      } else if (domainsEl && scrollPos >= domainsTop) {
        setActiveSection('domains');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run immediate check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, user]);

  // Handle smooth scroll when navigating to hash URLs
  useEffect(() => {
    if (pathname !== '/') return;

    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        const sectionId = hash.replace('#', '');
        const el = document.getElementById(sectionId);
        if (el) {
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const targetY = rect.top + window.scrollY - 110;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }, 100);
        }
      }
    };

    window.addEventListener('hashchange', handleHashScroll);
    handleHashScroll();

    return () => {
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, [pathname]);

  const handleNavLinkClick = (e, link) => {
    setMenuOpen(false);
    if (pathname === '/') {
      if (link.section === 'home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
        setActiveSection('home');
      } else {
        const el = document.getElementById(link.section);
        if (el) {
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          const targetY = rect.top + window.scrollY - 110;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
          window.history.pushState(null, '', link.href);
          setActiveSection(link.section);
        }
      }
    }
  };

  const publicLinks = [
    { href: '/', label: 'Home', section: 'home' },
    { href: '/#domains', label: 'Explore', section: 'domains' },
    { href: '/#maturity', label: 'Categories', section: 'maturity' },
    { href: '/#about', label: 'About', section: 'about' }
  ];

  const loggedInLinks = user ? [
    ...(isAdmin ? [{ href: '/admin', label: 'Admin Console', admin: true }] : [{ href: '/dashboard', label: 'Dashboard' }]),
  ] : [];

  // Hide navbar completely on assessment page or in fullscreen
  if (isAssessmentPage || isFullscreen) return null;

  return (
    <nav className="navbar-premium">
      <div className="container d-flex align-items-center h-100" style={{ gap: '0' }}>
        {/* Brand */}
        <Link href="/" className="navbar-brand me-4" onClick={() => setMenuOpen(false)}>
          <span className="nav-logo-icon">Σ</span>
          <span style={{ color: 'var(--text-primary)' }}>SDLC AI Maturity Assessment</span>
        </Link>

        {/* Desktop Nav Links */}
        {!isAuthPage && (
          <ul className="navbar-nav d-none d-lg-flex flex-row me-auto h-100">
            {user ? (
              loggedInLinks.map(link => (
                <li className="nav-item" key={link.href}>
                  <Link
                    href={link.href}
                    className={`nav-link${pathname === link.href ? ' active' : ''}${link.admin ? ' admin-link' : ''}`}
                    onClick={(e) => handleDashboardClick(e, link)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))
            ) : (
              publicLinks.map(link => (
                <li className="nav-item" key={link.href}>
                  <Link
                    href={link.href}
                    className={`nav-link${activeSection === link.section ? ' active' : ''}`}
                    onClick={(e) => handleNavLinkClick(e, link)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}

        {/* Right Controls */}
        {!isAuthPage && (
          <div className="d-flex align-items-center gap-2 ms-auto">
            {user ? (
              <div className="d-none d-md-flex align-items-center gap-3">
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={handleDropdownToggle}
                    className="d-flex align-items-center"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--green-primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {getInitials()}
                    </div>
                  </button>

                  {profileDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '40px',
                        right: 0,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        minWidth: '160px',
                        padding: '6px 0',
                        zIndex: 1010,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isAdmin && (
                        <Link
                          href="/dashboard?tab=profile"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.88rem',
                            textDecoration: 'none',
                          }}
                          onClick={handleEditProfileClick}
                          className="dropdown-item-premium"
                        >
                          <span className="material-icons" style={{ fontSize: '1.1rem' }}>person</span> Edit Profile
                        </Link>
                      )}

                      {!isAdmin && <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />}

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                        }}
                        style={{
                          display: 'flex',
                          width: '100%',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: '0.88rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        className="dropdown-item-premium"
                      >
                        <span className="material-icons" style={{ fontSize: '1.1rem' }}>logout</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              activeSection !== 'home' && (
                <div className="d-none d-md-flex gap-2 align-items-center">
                  <Link href="/login" style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', marginRight: '16px' }}>
                    Sign In
                  </Link>
                  <Link href="/signup" className="btn-premium" style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: '12px' }}>
                    Get Started
                  </Link>
                </div>
              )
            )}



            {/* Mobile Hamburger */}
            <button
              className="d-lg-none theme-toggle-btn ms-1"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              style={{ fontSize: '1.1rem' }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && !isAuthPage && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '12px 16px',
            zIndex: 999,
          }}
        >
          {user ? (
            loggedInLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="d-block py-2"
                style={{
                  color: link.admin ? 'var(--green-bright)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onClick={(e) => {
                  setMenuOpen(false);
                  handleDashboardClick(e, link);
                }}
              >
                {link.label}
              </Link>
            ))
          ) : (
            publicLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="d-block py-2"
                style={{
                  color: activeSection === link.section ? 'var(--green-bright)' : 'var(--text-secondary)',
                  fontWeight: activeSection === link.section ? 700 : 500,
                  fontSize: '0.95rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onClick={(e) => handleNavLinkClick(e, link)}
              >
                {link.label}
              </Link>
            ))
          )}
          {user ? (
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              style={{ color: 'var(--danger)', fontWeight: 500, fontSize: '0.95rem', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer' }}
            >
              Sign out
            </button>
          ) : (
            activeSection !== 'home' && (
              <div className="d-flex gap-2 mt-2">
                <Link href="/login" className="btn-premium-outline w-50 justify-content-center" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link href="/signup" className="btn-premium w-50 justify-content-center" onClick={() => setMenuOpen(false)}>Get Started</Link>
              </div>
            )
          )}
        </div>
      )}
    </nav>
  );
}
