'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language } = useLanguage();

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';
  const isSuperAdmin = user?.role?.name === 'Super Admin';

  const menuItems = [
    { en: 'Dashboard',     ne: 'ड्यासबोर्ड',         path: '/dashboard',     icon: 'bi-grid-1x2-fill',         show: true },
    { en: 'AI Insights',   ne: 'एआई अन्तर्दृष्टि',      path: '/ai-insights',   icon: 'bi-robot',                 show: isAdmin },
    { en: 'POS Screen',    ne: 'POS स्क्रिन',          path: '/pos',           icon: 'bi-display',               show: true },
    { en: 'Sales',         ne: 'बिक्री',               path: '/sales',         icon: 'bi-receipt',               show: !isSuperAdmin },
    { en: 'Sales Returns', ne: 'बिक्री फिर्ता',         path: '/sales-returns', icon: 'bi-receipt-cutoff',        show: !isSuperAdmin },
    { en: 'Fiscal Years',  ne: 'आर्थिक वर्ष',          path: '/fiscal-years',  icon: 'bi-calendar-check',        show: isAdmin },
    { en: 'Brands',        ne: 'ब्राण्डहरू',            path: '/brands',        icon: 'bi-award',                 show: true },
    { en: 'Products',      ne: 'उत्पादनहरू',            path: '/products',      icon: 'bi-box',                   show: true },
    { en: 'Stock',         ne: 'स्टक / इन्भेन्टरी',     path: '/inventory',     icon: 'bi-boxes',                 show: !isSuperAdmin },
    { en: 'Suppliers',     ne: 'आपूर्तिकर्ताहरू',       path: '/suppliers',     icon: 'bi-truck',                 show: !isSuperAdmin },
    { en: 'Purchases',     ne: 'खरिदहरू',              path: '/purchases',     icon: 'bi-cart-check',            show: !isSuperAdmin },
    { en: 'Purchase Returns', ne: 'खरिद फिर्ता',        path: '/purchase-returns', icon: 'bi-cart-x',             show: !isSuperAdmin },
    { en: 'Customers',     ne: 'ग्राहकहरू',             path: '/customers',     icon: 'bi-people',                show: !isSuperAdmin },
    { en: 'Expenses',      ne: 'खर्चहरू',              path: '/expenses',      icon: 'bi-wallet2',               show: !isSuperAdmin },
    { en: 'Incomes',       ne: 'आयहरू',                path: '/incomes',       icon: 'bi-cash-stack',            show: !isSuperAdmin },
    { en: 'Reports',       ne: 'प्रतिवेदनहरू',          path: '/reports',       icon: 'bi-file-earmark-bar-graph', show: isAdmin },
    { en: 'Accounting',    ne: 'लेखा',                 path: '/accounting',    icon: 'bi-journal-bookmark',      show: isAdmin },
    { en: 'Users',         ne: 'प्रयोगकर्ताहरू',        path: '/users',         icon: 'bi-person-badge',          show: isAdmin },
    { en: 'Companies',     ne: 'कम्पनीहरू',             path: '/companies',     icon: 'bi-building',              show: isSuperAdmin },
    { en: 'Settings',      ne: 'सेटिङहरू',              path: '/settings',      icon: 'bi-gear',                  show: isAdmin },
  ];

  return (
    <>
      <aside className="custom-sidebar d-none d-lg-flex">
      <div className="sidebar-header">
        <Link href="/dashboard" className="text-decoration-none">
          <div className="sidebar-brand-title d-flex align-items-center gap-2" style={{ padding: '0.5rem 0' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1rem', lineHeight: '1.2' }}>KoseliGhar POS</span>
          </div>
        </Link>
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

      {/* Mobile Offcanvas Sidebar */}
      <div className="offcanvas offcanvas-start d-lg-none shadow" tabIndex={-1} id="mobileSidebar" aria-labelledby="mobileSidebarLabel" style={{ width: '280px', backgroundColor: 'var(--glass-bg)' }}>
        <div className="offcanvas-header border-bottom">
          <Link href="/dashboard" className="text-decoration-none" data-bs-dismiss="offcanvas">
            <div className="sidebar-brand-title d-flex align-items-center gap-2" style={{ padding: '0.2rem 0' }}>
              <img src="/logo.png" alt="Logo" style={{ height: '30px', width: '30px', objectFit: 'contain' }} />
              <span className="text-dark" style={{ fontSize: '1.1rem', lineHeight: '1.2', fontWeight: 700 }}>KoseliGhar POS</span>
            </div>
          </Link>
          <button type="button" className="btn-close shadow-none" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body p-0">
          <div className="sidebar-menu h-100 mt-2">
            {menuItems.map(
              (item) =>
                item.show && (
                  <Link
                    key={`mobile-${item.en}`}
                    href={item.path}
                    data-bs-dismiss="offcanvas"
                    className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
                  >
                    <i className={`bi ${item.icon}`}></i>
                    <span>{language === 'ne' ? item.ne : item.en}</span>
                  </Link>
                )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
