'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function Sidebar({ isMobileOpen, onClose }: { isMobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language } = useLanguage();

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';
  const isSuperAdmin = user?.role?.name === 'Super Admin';

  const menuItems = [
    { en: 'Dashboard',     ne: 'ड्यासबोर्ड',         path: '/dashboard',     icon: 'bi-grid-1x2-fill',         show: true },
    { en: 'AI Insights',   ne: 'एआई अन्तर्दृष्टि',      path: '/ai-insights',   icon: 'bi-robot',                 show: isAdmin },
    { en: 'POS Screen',    ne: 'POS स्क्रिन',          path: '/pos',           icon: 'bi-display',               show: true },
    { en: 'Sales',         ne: 'बिक्री',               path: '/sales',         icon: 'bi-receipt',               show: true },
    { en: 'Fiscal Years',  ne: 'आर्थिक वर्ष',          path: '/fiscal-years',  icon: 'bi-calendar-check',        show: isAdmin },
    { en: 'Brands',        ne: 'ब्राण्डहरू',            path: '/brands',        icon: 'bi-award',                 show: true },
    { en: 'Products',      ne: 'उत्पादनहरू',            path: '/products',      icon: 'bi-box',                   show: true },
    { en: 'Suppliers',     ne: 'आपूर्तिकर्ताहरू',       path: '/suppliers',     icon: 'bi-truck',                 show: true },
    { en: 'Purchases',     ne: 'खरिदहरू',              path: '/purchases',     icon: 'bi-cart-check',            show: true },
    { en: 'Customers',     ne: 'ग्राहकहरू',             path: '/customers',     icon: 'bi-people',                show: true },
    { en: 'Expenses',      ne: 'खर्चहरू',              path: '/expenses',      icon: 'bi-wallet2',               show: true },
    { en: 'Incomes',       ne: 'आयहरू',                path: '/incomes',       icon: 'bi-cash-stack',            show: true },
    { en: 'Reports',       ne: 'प्रतिवेदनहरू',          path: '/reports',       icon: 'bi-file-earmark-bar-graph', show: isAdmin },
    { en: 'Accounting',    ne: 'लेखा',                 path: '/accounting',    icon: 'bi-journal-bookmark',      show: isAdmin },
    { en: 'Users',         ne: 'प्रयोगकर्ताहरू',        path: '/users',         icon: 'bi-person-badge',          show: isAdmin },
    { en: 'Companies',     ne: 'कम्पनीहरू',             path: '/companies',     icon: 'bi-building',              show: isSuperAdmin },
    { en: 'Settings',      ne: 'सेटिङहरू',              path: '/settings',      icon: 'bi-gear',                  show: isAdmin },
  ];

  return (
    <aside className={`custom-sidebar ${isMobileOpen ? 'd-flex mobile-open' : 'd-none d-lg-flex'}`}>
      <div className="sidebar-header d-flex justify-content-between align-items-center">
        <Link href="/dashboard" className="text-decoration-none" onClick={() => isMobileOpen && onClose?.()}>
          <div className="sidebar-brand-title d-flex align-items-center gap-2" style={{ padding: '0.5rem 0' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1rem', lineHeight: '1.2' }}>KoseliGhar POS</span>
          </div>
        </Link>
        {isMobileOpen && (
          <button className="btn btn-link d-lg-none text-dark p-0" onClick={onClose}>
            <i className="bi bi-x fs-2"></i>
          </button>
        )}
      </div>

      <div className="sidebar-menu">
        {menuItems.map(
          (item) =>
            item.show && (
              <Link
                key={item.en}
                href={item.path}
                className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{language === 'ne' ? item.ne : item.en}</span>
              </Link>
            )
        )}
      </div>
    </aside>
  );
}
