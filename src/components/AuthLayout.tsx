'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-secondary fw-semibold">Verifying Secure Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Avoid flash of layout before redirect
  }

  return (
    <div className="app-wrapper">
      {/* Dynamic Navigation Panels */}
      <Sidebar />
      
      <div className="main-content">
        <Navbar />
        <main>{children}</main>
      </div>
    </div>
  );
}
