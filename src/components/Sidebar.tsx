'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role?.name === 'Admin';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2-fill', show: true },
    { name: 'POS Screen', path: '/pos', icon: 'bi-display', show: true },
    { name: 'Fiscal Years', path: '/fiscal-years', icon: 'bi-calendar-check', show: isAdmin },
    { name: 'Sales', path: '/sales', icon: 'bi-receipt', show: true },
    { name: 'Products', path: '/products', icon: 'bi-box', show: true },
    { name: 'Brands', path: '/brands', icon: 'bi-award', show: true },
    { name: 'Customers', path: '/customers', icon: 'bi-people', show: true },
    { name: 'Suppliers', path: '/suppliers', icon: 'bi-truck', show: true },
    { name: 'Purchases', path: '/purchases', icon: 'bi-cart-check', show: true },
    { name: 'Expenses', path: '/expenses', icon: 'bi-wallet2', show: true },
    { name: 'Incomes', path: '/incomes', icon: 'bi-cash-stack', show: true },
    { name: 'Reports', path: '/reports', icon: 'bi-file-earmark-bar-graph', show: isAdmin },
    { name: 'Users', path: '/users', icon: 'bi-person-badge', show: isAdmin },
    { name: 'Settings', path: '/settings', icon: 'bi-gear', show: isAdmin },
  ];

  return (
    <aside className="custom-sidebar d-none d-lg-flex">
      <div className="sidebar-header">
        <Link href="/dashboard" className="text-decoration-none">
          <div className="sidebar-brand-title d-flex align-items-center gap-2" style={{ padding: '0.5rem 0' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1rem', lineHeight: '1.2' }}>Panchpokhari Koseli Ghar</span>
          </div>
        </Link>
      </div>

      <div className="sidebar-menu">
        {menuItems.map(
          (item) =>
            item.show && (
              <Link
                key={item.name}
                href={item.path}
                className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.name}</span>
              </Link>
            )
        )}
      </div>
    </aside>
  );
}
