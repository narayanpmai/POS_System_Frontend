'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import NepaliClock from './NepaliClock';

export default function Navbar() {
  const { user, logout, activeFiscalYear } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check local storage or system preference on mount
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

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ne' : 'en');
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <nav className="custom-navbar">
      <div className="d-flex align-items-center gap-4">
        {/* Fiscal Year Badge */}
        {activeFiscalYear && (
          <div className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 d-flex align-items-center gap-2">
            <i className="bi bi-calendar-check"></i>
            <span className="fw-medium">FY: {activeFiscalYear.name}</span>
          </div>
        )}

        {/* Nepali Clock Widget */}
        <NepaliClock />

        {/* Language Toggle Button */}
        <button
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 px-2 py-1 rounded-pill"
          onClick={toggleLanguage}
          title={language === 'en' ? 'नेपालीमा बदल्नुस्' : 'Switch to English'}
          style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: '60px' }}
        >
          <i className="bi bi-translate" style={{ fontSize: '0.85rem' }}></i>
          <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
        </button>

        {/* Dark mode toggle */}
        <button 
          className="btn btn-link text-dark p-0 border-0 fs-5 d-flex align-items-center justify-content-center theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <i className="bi bi-moon-stars-fill text-secondary"></i>
          ) : (
            <i className="bi bi-sun-fill text-warning"></i>
          )}
        </button>

        {/* User Dropdown */}
        <div className="dropdown">
          <button
            className="btn btn-light rounded-pill border-0 d-flex align-items-center gap-2 px-3 py-1 bg-white border shadow-sm"
            type="button"
            onClick={toggleDropdown}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
            aria-expanded={dropdownOpen}
          >
            <i className="bi bi-person-circle fs-5 text-secondary"></i>
            <span className="fw-semibold text-dark fs-7">{user?.name || t('common', 'loading')}</span>
            <i className="bi bi-caret-down-fill ms-1" style={{ fontSize: '0.65rem' }}></i>
          </button>
          
          <ul className={`dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-md p-2 mt-2 ${dropdownOpen ? 'show' : ''}`} style={{ position: 'absolute' }}>
            <li className="p-3 border-bottom">
              <h6 className="m-0 fw-bold">{user?.name || t('common', 'profile')}</h6>
              <small className="text-primary fw-semibold">{user?.role?.name || 'Cashier'}</small>
            </li>
            <li className="pt-2">
              <button className="dropdown-item text-danger py-2 rounded-md" onClick={logout}>
                <i className="bi bi-box-arrow-right me-2"></i>{t('common', 'logout')}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
