'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import NepaliClock from './NepaliClock';

export default function Navbar() {
  const { user, logout, activeFiscalYear } = useAuth();
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
            id="userDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-person-circle fs-5 text-secondary"></i>
            <span className="font-weight-semibold text-dark fs-7">{user?.name || 'Loading...'}</span>
            <i className="bi bi-caret-down-fill ms-1" style={{ fontSize: '0.65rem' }}></i>
          </button>
          
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-md p-2 mt-2" aria-labelledby="userDropdown">
            <li className="p-3 border-bottom">
              <h6 className="m-0 font-weight-bold">{user?.name || 'User'}</h6>
              <small className="text-primary font-weight-semibold">{user?.role?.name || 'Cashier'}</small>
            </li>
            <li className="pt-2">
              <button className="dropdown-item text-danger py-2 rounded-md" onClick={logout}>
                <i className="bi bi-box-arrow-right me-2"></i>Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
