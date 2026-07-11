'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const { register, error, clearError, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: 'linear-gradient(135deg, #0b1329 0%, #1c2a4a 100%)' }}>
      <div className="card shadow-2xl border-0 p-4 p-md-5 rounded-lg text-white" style={{ maxWidth: '480px', width: '100%', backgroundColor: 'rgba(21, 34, 68, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        
        <div className="text-center mb-4">
          <h2 className="fw-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Register <span className="text-warning">Cashier</span>
          </h2>
          <p className="text-light" style={{ fontSize: '0.9rem' }}>Create a new cashier user to operate checkout terminals</p>
        </div>

        {(error || localError) && (
          <div className="alert alert-danger border-0 text-white rounded-md d-flex align-items-center gap-2" style={{ backgroundColor: '#ef4444', fontSize: '0.85rem' }} role="alert">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{localError || error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-light fs-7">Full Name</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-0 text-light"><i className="bi bi-person"></i></span>
              <input
                type="text"
                className="form-control bg-dark border-0 text-white"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => { setLocalError(null); setName(e.target.value); }}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-light fs-7">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-0 text-light"><i className="bi bi-envelope"></i></span>
              <input
                type="email"
                className="form-control bg-dark border-0 text-white"
                placeholder="cashier@pos.com"
                value={email}
                onChange={(e) => { setLocalError(null); setEmail(e.target.value); }}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-light fs-7">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-0 text-light"><i className="bi bi-shield-lock"></i></span>
              <input
                type="password"
                className="form-control bg-dark border-0 text-white"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => { setLocalError(null); setPassword(e.target.value); }}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label text-light fs-7">Confirm Password</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-0 text-light"><i className="bi bi-shield-lock-fill"></i></span>
              <input
                type="password"
                className="form-control bg-dark border-0 text-white"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => { setLocalError(null); setConfirmPassword(e.target.value); }}
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
            <span>Register Account</span>
          </button>
        </form>

        <p className="mt-4 mb-0 text-center text-light" style={{ fontSize: '0.85rem' }}>
          Already have account? <Link href="/login" className="text-warning text-decoration-none">Login here</Link>
        </p>
      </div>
    </div>
  );
}
