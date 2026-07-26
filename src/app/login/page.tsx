'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, error, clearError, isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setSubmitting(false);
    }
  };

  const handleDemoFill = (role: 'admin' | 'cashier') => {
    clearError();
    if (role === 'admin') {
      setEmail('admin@pos.com');
      setPassword('admin123');
    } else {
      setEmail('cashier@pos.com');
      setPassword('cashier123');
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: 'linear-gradient(135deg, #0b1329 0%, #1c2a4a 100%)' }}>
      <div className="card shadow-2xl border-0 p-4 p-md-5 rounded-lg text-white" style={{ maxWidth: '480px', width: '100%', backgroundColor: 'rgba(21, 34, 68, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        
        <div className="text-center mb-5">
          <h2 className="fw-bold text-white mb-2 d-flex align-items-center justify-content-center gap-2" style={{ letterSpacing: '1px' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '48px', width: '48px', objectFit: 'contain' }} />
            <span>KoseliGhar POS</span>
          </h2>
          <p className="text-light" style={{ fontSize: '0.9rem' }}>{t('auth', 'signin_subtitle') || 'Sign in to continue retail and cashier checkout'}</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 text-white rounded-md d-flex align-items-center gap-2" style={{ backgroundColor: '#ef4444', fontSize: '0.85rem' }} role="alert">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-light fs-7">{t('auth', 'email') || 'Email Address'}</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-0 text-light"><i className="bi bi-envelope"></i></span>
              <input
                type="email"
                className="form-control bg-dark border-0 text-white"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => { clearError(); setEmail(e.target.value); }}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between">
              <label className="form-label text-light fs-7">{t('auth', 'password') || 'Password'}</label>
              <Link href="/login" onClick={() => alert('Demo password reset feature. To log in, please use admin@pos.com with password admin123')} className="text-warning text-decoration-none" style={{ fontSize: '0.8rem' }}>Forgot password?</Link>
            </div>
            <div className="input-group">
              <span className="input-group-text bg-dark border-0 text-light"><i className="bi bi-shield-lock"></i></span>
              <input
                type="password"
                className="form-control bg-dark border-0 text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { clearError(); setPassword(e.target.value); }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-warning w-100 py-2.5 fw-bold text-dark d-flex align-items-center justify-content-center gap-2" disabled={submitting || loading}>
            {submitting ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <i className="bi bi-box-arrow-in-right"></i>
            )}
            <span>{t('auth', 'login') || 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-top border-secondary text-center">
          <p className="text-light mb-2" style={{ fontSize: '0.8rem' }}>Click below to instantly fill Demo accounts:</p>
          <div className="d-flex justify-content-center gap-2">
            <button className="btn btn-sm btn-outline-primary text-white border-primary" onClick={() => handleDemoFill('admin')} style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-key me-1"></i>Admin Demo
            </button>
            <button className="btn btn-sm btn-outline-warning text-white border-warning" onClick={() => handleDemoFill('cashier')} style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-person me-1"></i>Cashier Demo
            </button>
          </div>
        </div>

        <p className="mt-4 mb-0 text-center text-light" style={{ fontSize: '0.85rem' }}>
          {t('auth', 'dont_have_account') || "Don't have cashier account?"} <Link href="/register" className="text-warning text-decoration-none">{t('auth', 'register') || 'Register here'}</Link>
        </p>
      </div>
    </div>
  );
}
