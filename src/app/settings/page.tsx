'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user, token, api } = useAuth();
  const isAdmin = user?.role?.name === 'Admin';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    storeName: '',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    currencySymbol: 'Rs.',
    receiptHeader: 'Thank you for shopping with us!',
    receiptFooter: '',
    taxRateDefault: 13.0,
    invoicePrefix: 'PTRM',
  });

  const loadSettings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setForm({
        storeName: res.data.storeName || '',
        address: res.data.address || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
        taxNumber: res.data.taxNumber || '',
        currencySymbol: res.data.currencySymbol || 'Rs.',
        receiptHeader: res.data.receiptHeader || 'Thank you for shopping with us!',
        receiptFooter: res.data.receiptFooter || '',
        taxRateDefault: res.data.taxRateDefault !== undefined ? res.data.taxRateDefault : 13.0,
        invoicePrefix: res.data.invoicePrefix || 'PTRM',
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators are authorized to change system configurations');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        taxRateDefault: Number(form.taxRateDefault),
      };
      await api.put('/settings', payload);
      alert('Store settings successfully updated!');
      setSubmitting(false);
      loadSettings();
    } catch (err: any) {
      setSubmitting(false);
      alert(err.response?.data?.message || 'Error updating settings');
    }
  };

  const inputStyle = {
    borderRadius: '8px',
    backgroundColor: 'var(--light-bg)',
    border: '1px solid #dee2e6',
    padding: '10px 14px',
    fontSize: '0.9rem',
    color: 'var(--text-dark)',
  };

  return (
    <AuthLayout>
      <div className="row g-4 justify-content-center">
        <div className="col-12 col-xl-9">
          
          {!isAdmin && (
            <div className="alert alert-warning border-0 rounded-lg p-3 d-flex align-items-center gap-3 mb-4 shadow-sm" role="alert">
              <i className="bi bi-exclamation-triangle-fill fs-4 text-warning"></i>
              <div>
                <strong>Read-Only Mode:</strong> You are signed in as a Cashier. Only Store Administrators hold permission to edit currency or tax system variables.
              </div>
            </div>
          )}

          <div className="card border-0 rounded-md p-4 shadow-sm" style={{ backgroundColor: 'var(--light-card)', borderRadius: '12px' }}>
            {/* Header */}
            <div className="d-flex align-items-center gap-2 mb-4 pb-1">
              <i className="bi bi-gear-fill fs-4" style={{ color: '#0d6efd' }}></i>
              <h4 className="font-weight-bold text-dark m-0" style={{ fontSize: '1.25rem' }}>System Settings</h4>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Loading settings configuration...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                
                {/* 1. STORE INFORMATION */}
                <div className="mb-4">
                  <h6 className="font-weight-bold text-secondary tracking-wide mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.07em' }}>
                    STORE INFORMATION
                  </h6>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Store Name</label>
                      <input
                        type="text"
                        className="form-control"
                        style={inputStyle}
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Store Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        style={inputStyle}
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Store Email</label>
                      <input
                        type="email"
                        className="form-control"
                        style={inputStyle}
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Currency Symbol</label>
                      <input
                        type="text"
                        className="form-control"
                        style={inputStyle}
                        value={form.currencySymbol}
                        onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>VAT Number / PAN Number</label>
                      <input
                        type="text"
                        className="form-control"
                        style={inputStyle}
                        value={form.taxNumber}
                        onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Store Address</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        style={{ ...inputStyle, resize: 'none' }}
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. INVOICE SETTINGS */}
                <div className="mb-4">
                  <h6 className="font-weight-bold text-secondary tracking-wide mb-3 mt-4" style={{ fontSize: '0.75rem', letterSpacing: '0.07em' }}>
                    INVOICE SETTINGS
                  </h6>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Receipt Footer Note</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        style={{ ...inputStyle, resize: 'none' }}
                        value={form.receiptFooter}
                        onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="form-control"
                        style={inputStyle}
                        value={form.taxRateDefault}
                        onChange={(e) => setForm({ ...form, taxRateDefault: Number(e.target.value) || 0 })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label font-weight-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Invoice Prefix</label>
                      <input
                        type="text"
                        className="form-control"
                        style={inputStyle}
                        value={form.invoicePrefix}
                        onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                        required
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit trigger */}
                {isAdmin && (
                  <div className="d-flex justify-content-start mt-4 pt-2">
                    <button
                      className="btn btn-primary rounded-pill px-4 py-2.5 font-weight-bold text-white d-flex align-items-center gap-2 border-0 shadow-sm"
                      style={{ backgroundColor: '#0d6efd', fontSize: '0.9rem' }}
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                      ) : (
                        <i className="bi bi-check-circle-fill"></i>
                      )}
                      <span>Save Settings</span>
                    </button>
                  </div>
                )}

              </form>
            )}

          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
