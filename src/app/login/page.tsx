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

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #062b1b 0%, #031525 100%)' }}>
      
      {/* Decorative background elements */}
      <div className="position-absolute rounded-circle" style={{ width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(26, 116, 56, 0.15) 0%, rgba(0,0,0,0) 70%)', top: '-10%', left: '-10%' }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(234, 179, 8, 0.1) 0%, rgba(0,0,0,0) 70%)', bottom: '-5%', right: '-5%' }}></div>
      
      <div className="card shadow-lg border-0 p-4 p-md-5 rounded-4 text-white position-relative" style={{ 
        maxWidth: '460px', width: '100%', 
        background: 'linear-gradient(180deg, rgba(20, 40, 30, 0.85) 0%, rgba(10, 20, 25, 0.95) 100%)', 
        backdropFilter: 'blur(16px)', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        <div className="text-center mb-4">
          <div className="mb-3 d-flex justify-content-center position-relative">
            <img
              src="/logo.png"
              alt="कोसेली घर Logo"
              style={{
                height: '140px',
                width: '140px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
                transition: 'transform 0.3s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
          </div>
          <h2 className="fw-bolder text-white mb-2" style={{ letterSpacing: '0.5px', fontSize: '1.75rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            कोसेली घर POS
          </h2>
          <p className="fw-medium mb-1" style={{ color: '#eab308', fontSize: '0.9rem', letterSpacing: '0.5px' }}>स्थानीय उत्पादन, हाम्रो पहिचान</p>
          <p className="text-light opacity-75" style={{ fontSize: '0.85rem' }}>{t('auth', 'signin_subtitle') || 'गाउँघरको कोसेली, समृद्ध किसानको अभियान'}</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 text-white rounded-3 d-flex align-items-center gap-2 mb-4 p-3 shadow-sm" style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)', fontSize: '0.85rem', backdropFilter: 'blur(4px)' }} role="alert">
            <i className="bi bi-exclamation-octagon-fill fs-6"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-light fs-7 fw-medium mb-2 opacity-75">{t('auth', 'email') || 'Email Address'}</label>
            <div className="input-group">
              <span className="input-group-text border-0 text-light" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}><i className="bi bi-envelope"></i></span>
              <input
                type="email"
                className="form-control border-0 text-white shadow-none"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', fontSize: '0.95rem' }}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => { clearError(); setEmail(e.target.value); }}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label text-light fs-7 fw-medium mb-0 opacity-75">{t('auth', 'password') || 'Password'}</label>
              <Link href="/login" onClick={(e) => { e.preventDefault(); alert('Password reset requested. Please contact system administrator.'); }} className="text-decoration-none" style={{ color: '#eab308', fontSize: '0.8rem', opacity: 0.9, transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = '1'} onMouseOut={(e) => e.currentTarget.style.opacity = '0.9'}>Forgot password?</Link>
            </div>
            <div className="input-group">
              <span className="input-group-text border-0 text-light" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}><i className="bi bi-shield-lock"></i></span>
              <input
                type="password"
                className="form-control border-0 text-white shadow-none"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', fontSize: '0.95rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { clearError(); setPassword(e.target.value); }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn w-100 py-2 fw-bold text-dark d-flex align-items-center justify-content-center gap-2 rounded-3 border-0 shadow-sm" style={{ background: 'linear-gradient(to right, #eab308, #f59e0b)', transition: 'all 0.3s ease' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(234, 179, 8, 0.4)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; }} disabled={submitting || loading}>
            {submitting ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <i className="bi bi-box-arrow-in-right fs-5"></i>
            )}
            <span style={{ fontSize: '1rem' }}>{t('auth', 'login') || 'Sign In'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
