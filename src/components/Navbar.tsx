'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import NepaliClock from './NepaliClock';

export default function Navbar() {
  const { user, logout, activeFiscalYear, api, superAdminCompanyId, setSuperAdminCompanyId } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role?.name === 'Super Admin') {
      api.get('/companies').then(res => setCompanies(res.data)).catch(console.error);
    }
  }, [user]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ne' : 'en');
  };

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    logout();
  };

  return (
    <nav className="custom-navbar d-flex justify-content-between align-items-center px-3 px-md-4">
      <div className="d-flex align-items-center gap-2 gap-md-4">
        {/* Back Button */}
        <button
          className="btn btn-light border shadow-sm rounded-md d-flex align-items-center justify-content-center"
          type="button"
          onClick={() => router.back()}
          title="Go Back"
          style={{ width: '40px', height: '40px' }}
        >
          <i className="bi bi-arrow-left fs-5 text-dark"></i>
        </button>

        {/* Mobile Hamburger Button */}
        <button 
          className="btn btn-light d-xl-none border shadow-sm rounded-md d-flex align-items-center justify-content-center"
          type="button" 
          data-bs-toggle="offcanvas" 
          data-bs-target="#mobileSidebar" 
          aria-controls="mobileSidebar"
          style={{ width: '40px', height: '40px' }}
        >
          <i className="bi bi-list fs-4 text-dark"></i>
        </button>

        {/* Fiscal Year Badge */}
        {activeFiscalYear ? (
          <div className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 d-none d-lg-flex align-items-center gap-2">
            <i className="bi bi-calendar-check"></i>
            <span className="fw-medium">{language === 'ne' ? 'आर्थिक वर्ष:' : 'FY:'} {activeFiscalYear.name}</span>
          </div>
        ) : (
          <a
            href="/fiscal-years"
            className="badge bg-warning bg-opacity-25 text-dark border border-warning rounded-pill px-3 py-2 d-flex align-items-center gap-2 text-decoration-none shadow-sm"
          >
            <i className="bi bi-exclamation-triangle-fill text-danger"></i>
            <span className="fw-bold">{language === 'ne' ? 'चालु आर्थिक वर्ष सेट गर्नुहोस्' : 'Set Active FY'}</span>
          </a>
        )}

        {/* Nepali Clock Widget (Visible on Large Desktop Displays >= 1400px) */}
        <div className="d-none d-xxl-block">
          <NepaliClock />
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 gap-sm-3">
        {/* Super Admin Global Tenant Company Selector */}
        {user?.role?.name === 'Super Admin' && (
          <div className="d-flex align-items-center gap-1">
            <select 
              className="form-select form-select-sm border-primary text-primary fw-bold rounded-pill shadow-sm"
              style={{ minWidth: '220px', height: '38px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: '#f0f7ff' }}
              value={superAdminCompanyId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSuperAdminCompanyId(val ? parseInt(val, 10) : null);
                setTimeout(() => window.location.reload(), 150);
              }}
              title="Select tenant company to filter system-wide data"
            >
              <option value="">🌐 All Companies (Global View)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>🏢 {c.name}</option>
              ))}
            </select>
          </div>
        )}
  
        {/* Language Toggle Button */}
        <button
          type="button"
          className="btn btn-light border shadow-sm rounded-pill d-flex align-items-center gap-2 px-3 text-dark hover-lift"
          onClick={toggleLanguage}
          title={language === 'en' ? 'नेपालीमा बदल्नुस्' : 'Switch to English'}
          style={{
            height: '38px',
            fontSize: '0.82rem',
            fontWeight: 600,
            backgroundColor: '#ffffff',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="bi bi-translate text-primary" style={{ fontSize: '1rem' }}></i>
          <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
        </button>

        {/* Dark mode toggle */}
        <button 
          type="button"
          className="btn btn-light border shadow-sm rounded-circle d-flex align-items-center justify-content-center hover-lift"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{ width: '38px', height: '38px', backgroundColor: '#ffffff', padding: 0 }}
        >
          {theme === 'light' ? (
            <i className="bi bi-moon-stars-fill text-secondary" style={{ fontSize: '0.95rem' }}></i>
          ) : (
            <i className="bi bi-sun-fill text-warning" style={{ fontSize: '0.95rem' }}></i>
          )}
        </button>

        {/* User Dropdown */}
        <div className="dropdown position-relative" ref={dropdownRef}>
          <button
            className="btn btn-light rounded-pill border shadow-sm d-flex align-items-center gap-2 px-3 bg-white text-dark hover-lift text-nowrap"
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            style={{ height: '38px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            <i className="bi bi-person-circle fs-5 text-primary"></i>
            <span className="fw-semibold text-dark text-nowrap">{user?.name || t('common', 'loading')}</span>
            <i className="bi bi-caret-down-fill ms-1 text-muted" style={{ fontSize: '0.65rem' }}></i>
          </button>
          
          {dropdownOpen && (
            <div
              className="dropdown-menu dropdown-menu-end show shadow-lg border-0 p-2 mt-2"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                borderRadius: '16px',
                minWidth: '220px',
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                zIndex: 1050,
              }}
            >
              <div className="p-3 border-bottom mb-2 bg-light bg-opacity-50 rounded-3">
                <h6 className="m-0 fw-bold text-dark">{user?.name || 'User Profile'}</h6>
                <div className="d-flex align-items-center justify-content-between mt-1">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1">
                    {user?.role?.name || 'Cashier'}
                  </span>
                </div>
                {user?.email && (
                  <small className="text-muted d-block text-truncate mt-1" style={{ fontSize: '0.75rem' }}>
                    {user.email}
                  </small>
                )}
              </div>

              <button
                type="button"
                className="dropdown-item text-danger py-2 px-3 rounded-3 d-flex align-items-center gap-2 fw-semibold"
                onClick={handleLogoutClick}
                style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
              >
                <i className="bi bi-box-arrow-right fs-5"></i>
                <span>{t('common', 'logout') || 'Logout'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
