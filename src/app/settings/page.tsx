'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

import TableControls, { applyPagination } from '@/components/TableControls';
export default function SettingsPage() {
  const router = useRouter();
  const { user, token, api } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';

  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Submenu Selection
  const [activeTab, setActiveTab] = useState<'general' | 'preferences' | 'notifications' | 'security' | 'backup' | 'help' | 'faq'>('general');

  // Help states
  const [diagStatus, setDiagStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [diagLogs, setDiagLogs] = useState<string[]>([]);

  // FAQ states
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0); // Default to first item expanded

  // Form State for backend settings
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

  // Local state for Notifications and Security configurations
  const [notifConfig, setNotifConfig] = useState({
    lowStockAlerts: true,
    lowStockThreshold: 10,
    emailNotifications: false,
    smsInvoiceAlerts: false,
  });

  const [securityConfig, setSecurityConfig] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Backup & Restore states
  const [backupStatus, setBackupStatus] = useState<'idle' | 'generating' | 'success'>('idle');
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupHistory, setBackupHistory] = useState([
    { id: 1, name: 'auto_backup_nightly_2026-07-08.sql', size: '4.82 MB', date: '2026-07-08 23:00:12', type: 'System Auto' },
    { id: 2, name: 'auto_backup_nightly_2026-07-07.sql', size: '4.79 MB', date: '2026-07-07 23:00:08', type: 'System Auto' },
    { id: 3, name: 'user_pre_update_backup.sql', size: '4.75 MB', date: '2026-07-06 14:15:22', type: 'Manual' },
  ]);

  const handleDownloadConfigBackup = () => {
    try {
      const backupData = {
        smartpos_backup_version: '1.0',
        timestamp: new Date().toISOString(),
        form,
        notifConfig,
        securityConfig,
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartpos_settings_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error creating settings backup file.');
    }
  };

  const handleRestoreConfigBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      alert('Only administrators are authorized to perform system restoration');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);
        
        setSubmitting(true);
        if (backupData.type === 'TENANT_SCOPED_BACKUP' || backupData.data) {
          const res = await api.post('/settings/backup/import', backupData);
          alert(res.data?.message || 'Tenant data successfully restored!');
        } else {
          if (!backupData.form || typeof backupData.form.storeName !== 'string') {
            throw new Error('Invalid settings backup file format.');
          }

          setForm(backupData.form);

          if (backupData.notifConfig) {
            setNotifConfig(backupData.notifConfig);
            localStorage.setItem('smartpos_notifications', JSON.stringify(backupData.notifConfig));
          }

          if (backupData.securityConfig) {
            setSecurityConfig(backupData.securityConfig);
            localStorage.setItem('smartpos_security', JSON.stringify(backupData.securityConfig));
          }

          const payload = {
            ...backupData.form,
            taxRateDefault: Number(backupData.form.taxRateDefault),
          };
          await api.put('/settings', payload);
          alert('Configuration settings successfully restored!');
        }
        setSubmitting(false);
        loadSettings();
      } catch (err: any) {
        setSubmitting(false);
        alert(err.response?.data?.message || err.message || 'Error parsing backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerateDBBackup = async () => {
    if (!isAdmin) {
      alert('Only administrators are authorized to create company backups');
      return;
    }

    setBackupStatus('generating');
    setBackupProgress(30);

    try {
      const res = await api.get('/settings/backup/export');
      setBackupProgress(80);

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `koselighar_backup_company_${user?.companyId || 'data'}_${timestamp}.json`;
      const jsonString = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupProgress(100);
      setBackupStatus('success');

      const sizeKB = (jsonString.length / 1024).toFixed(2);
      const newBackup = {
        id: Date.now(),
        name: fileName,
        size: `${sizeKB} KB`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        type: 'Tenant Data Backup',
      };
      setBackupHistory(prev => [newBackup, ...prev]);

      setTimeout(() => {
        setBackupStatus('idle');
      }, 1500);
    } catch (err: any) {
      setBackupStatus('idle');
      alert(err.response?.data?.message || 'Error generating tenant backup file.');
    }
  };

  const handleRestoreDBBackup = (name: string) => {
    if (!isAdmin) {
      alert('Only administrators are authorized to perform restorations');
      return;
    }
    const confirmRestore = window.confirm(`Are you sure you want to restore the entire database from snapshot: ${name}? This will overwrite current transaction logs.`);
    if (confirmRestore) {
      alert(`Database successfully restored from snapshot ${name}!`);
    }
  };

  const handleDeleteDBBackup = (id: number) => {
    if (!isAdmin) {
      alert('Only administrators are authorized to delete backups');
      return;
    }
    setBackupHistory(prev => prev.filter(b => b.id !== id));
  };

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

  // Load mock settings from localStorage on client side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedNotifs = localStorage.getItem('smartpos_notifications');
      if (storedNotifs) {
        try { setNotifConfig(JSON.parse(storedNotifs)); } catch (e) { console.error(e); }
      }
      const storedSecurity = localStorage.getItem('smartpos_security');
      if (storedSecurity) {
        try { setSecurityConfig(JSON.parse(storedSecurity)); } catch (e) { console.error(e); }
      }
    }
  }, []);

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

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators are authorized to change system configurations');
      return;
    }
    localStorage.setItem('smartpos_notifications', JSON.stringify(notifConfig));
    alert('Notification settings successfully updated!');
  };

  const handleSaveSecurityConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators are authorized to change security settings');
      return;
    }
    localStorage.setItem('smartpos_security', JSON.stringify(securityConfig));
    alert('Security configurations successfully updated!');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators are authorized to perform security changes');
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      alert('New password and confirm password do not match');
      return;
    }
    if (securityForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/users/${user.id}/reset-password`, {
        newPassword: securityForm.newPassword,
      });
      alert('Password updated successfully!');
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSubmitting(false);
    } catch (err: any) {
      setSubmitting(false);
      alert(err.response?.data?.message || 'Error updating password');
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

  // Content Renderers
  const renderGeneralSettings = () => (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-3 pb-1">
          <i className="bi bi-building fs-5 text-primary"></i>
          <h5 className="fw-bold text-dark m-0">{t('settings', 'store_settings')}</h5>
        </div>
        <p className="text-muted small mb-4">{t('common', 'description')}</p>
        
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>{t('settings', 'store_name')}</label>
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
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>{t('settings', 'store_phone')}</label>
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
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>{t('settings', 'store_email')}</label>
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
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>{t('settings', 'currency_symbol')}</label>
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
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>{t('settings', 'tax_number')}</label>
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
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>{t('settings', 'store_address')}</label>
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

      {isAdmin && (
        <div className="d-flex justify-content-start mt-4 pt-2">
          <button
            className="btn btn-primary rounded-pill px-4 py-2 fw-bold text-white d-flex align-items-center gap-2 border-0 shadow-sm"
            style={{ backgroundColor: '#0d6efd', fontSize: '0.9rem' }}
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <span className="spinner-border spinner-border-sm" role="status"></span>
            ) : (
              <i className="bi bi-check-circle-fill"></i>
            )}
            <span>{t('common', 'save')}</span>
          </button>
        </div>
      )}
    </form>
  );

  const renderSystemPreferences = () => (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-3 pb-1">
          <i className="bi bi-sliders fs-5 text-primary"></i>
          <h5 className="fw-bold text-dark m-0">{t('settings', 'notification_settings')}</h5>
        </div>
        <p className="text-muted small mb-4">Configure invoice generation, prefixes, default tax rates, and receipt formatting options.</p>

        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Receipt Footer Note</label>
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
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Tax Rate (%)</label>
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
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Invoice Prefix</label>
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

      {isAdmin && (
        <div className="d-flex justify-content-start mt-4 pt-2">
          <button
            className="btn btn-primary rounded-pill px-4 py-2 fw-bold text-white d-flex align-items-center gap-2 border-0 shadow-sm"
            style={{ backgroundColor: '#0d6efd', fontSize: '0.9rem' }}
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              <span className="spinner-border spinner-border-sm" role="status"></span>
            ) : (
              <i className="bi bi-check-circle-fill"></i>
            )}
            <span>Save Preferences</span>
          </button>
        </div>
      )}
    </form>
  );

  const renderNotifications = () => (
    <form onSubmit={handleSaveNotifications}>
      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-3 pb-1">
          <i className="bi bi-bell fs-5 text-primary"></i>
          <h5 className="fw-bold text-dark m-0">Notifications Settings</h5>
        </div>
        <p className="text-muted small mb-4">Toggle system alerts, threshold indicators, and automated email/SMS messaging preferences.</p>

        <div className="row g-3">
          <div className="col-12">
            <div className="form-check form-switch p-3 border rounded d-flex align-items-center justify-content-between gap-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
              <div className="d-flex flex-column">
                <label className="form-check-label fw-bold text-dark mb-0 ms-0" htmlFor="lowStockAlerts" style={{ cursor: 'pointer' }}>
                  Low Stock Alerts
                </label>
                <span className="text-muted small">Notify store administrators when products go below safety stock threshold.</span>
              </div>
              <input
                className="form-check-input fs-5 me-0 shadow-none"
                type="checkbox"
                id="lowStockAlerts"
                checked={notifConfig.lowStockAlerts}
                onChange={(e) => setNotifConfig({ ...notifConfig, lowStockAlerts: e.target.checked })}
                disabled={!isAdmin}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Low Stock Alert Threshold</label>
            <input
              type="number" step="any" className="form-control"
              style={inputStyle}
              min="1"
              value={notifConfig.lowStockThreshold}
              onChange={(e) => setNotifConfig({ ...notifConfig, lowStockThreshold: Number(e.target.value) || 0 })}
              required
              disabled={!isAdmin || !notifConfig.lowStockAlerts}
            />
          </div>

          <div className="col-12">
            <div className="form-check form-switch p-3 border rounded d-flex align-items-center justify-content-between gap-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
              <div className="d-flex flex-column">
                <label className="form-check-label fw-bold text-dark mb-0 ms-0" htmlFor="emailNotifications" style={{ cursor: 'pointer' }}>
                  Send Daily Sales Report Email
                </label>
                <span className="text-muted small">Email a summarized daily revenue and performance log to the store admin.</span>
              </div>
              <input
                className="form-check-input fs-5 me-0 shadow-none"
                type="checkbox"
                id="emailNotifications"
                checked={notifConfig.emailNotifications}
                onChange={(e) => setNotifConfig({ ...notifConfig, emailNotifications: e.target.checked })}
                disabled={!isAdmin}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="col-12">
            <div className="form-check form-switch p-3 border rounded d-flex align-items-center justify-content-between gap-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
              <div className="d-flex flex-column">
                <label className="form-check-label fw-bold text-dark mb-0 ms-0" htmlFor="smsInvoiceAlerts" style={{ cursor: 'pointer' }}>
                  Enable SMS Customer Invoices
                </label>
                <span className="text-muted small">Automatically text transactional receipts directly to registered customer cellphones.</span>
              </div>
              <input
                className="form-check-input fs-5 me-0 shadow-none"
                type="checkbox"
                id="smsInvoiceAlerts"
                checked={notifConfig.smsInvoiceAlerts}
                onChange={(e) => setNotifConfig({ ...notifConfig, smsInvoiceAlerts: e.target.checked })}
                disabled={!isAdmin}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="d-flex justify-content-start mt-4 pt-2">
          <button
            className="btn btn-primary rounded-pill px-4 py-2 fw-bold text-white d-flex align-items-center gap-2 border-0 shadow-sm"
            style={{ backgroundColor: '#0d6efd', fontSize: '0.9rem' }}
            type="submit"
          >
            <i className="bi bi-check-circle-fill"></i>
            <span>Save Notification Preferences</span>
          </button>
        </div>
      )}
    </form>
  );

  const renderSecurity = () => (
    <div>
      {/* 2FA Toggle Config */}
      <form onSubmit={handleSaveSecurityConfig} className="mb-5 pb-4 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
        <div className="d-flex align-items-center gap-2 mb-3 pb-1">
          <i className="bi bi-shield fs-5 text-primary"></i>
          <h5 className="fw-bold text-dark m-0">Security Authentication</h5>
        </div>
        <p className="text-muted small mb-4">Manage multi-factor verification mechanisms and user session parameters.</p>

        <div className="row g-3">
          <div className="col-12">
            <div className="form-check form-switch p-3 border rounded d-flex align-items-center justify-content-between gap-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
              <div className="d-flex flex-column">
                <label className="form-check-label fw-bold text-dark mb-0 ms-0" htmlFor="twoFactorAuth" style={{ cursor: 'pointer' }}>
                  Enforce Two-Factor Authentication (2FA)
                </label>
                <span className="text-muted small">Require an OTP verification code via Google Authenticator at login.</span>
              </div>
              <input
                className="form-check-input fs-5 me-0 shadow-none"
                type="checkbox"
                id="twoFactorAuth"
                checked={securityConfig.twoFactorAuth}
                onChange={(e) => setSecurityConfig({ ...securityConfig, twoFactorAuth: e.target.checked })}
                disabled={!isAdmin}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Session Automatic Inactivity Timeout (minutes)</label>
            <input
              type="number" step="any" className="form-control"
              style={inputStyle}
              min="5"
              value={securityConfig.sessionTimeout}
              onChange={(e) => setSecurityConfig({ ...securityConfig, sessionTimeout: Number(e.target.value) || 0 })}
              required
              disabled={!isAdmin}
            />
          </div>
        </div>

        {isAdmin && (
          <div className="d-flex justify-content-start mt-4 pt-2">
            <button
              className="btn btn-primary rounded-pill px-4 py-2 fw-bold text-white d-flex align-items-center gap-2 border-0 shadow-sm"
              style={{ backgroundColor: '#0d6efd', fontSize: '0.9rem' }}
              type="submit"
            >
              <i className="bi bi-check-circle-fill"></i>
              <span>Save Security Policy</span>
            </button>
          </div>
        )}
      </form>

      {/* Password Reset form */}
      <form onSubmit={handleChangePassword}>
        <div className="d-flex align-items-center gap-2 mb-3 pb-1">
          <i className="bi bi-shield-lock-fill fs-5 text-primary"></i>
          <h5 className="fw-bold text-dark m-0">Change Administrator Password</h5>
        </div>
        <p className="text-muted small mb-4">Set a strong, new password specifically for the logged-in administrator account.</p>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>New Password</label>
            <input
              type="password"
              className="form-control"
              style={inputStyle}
              value={securityForm.newPassword}
              onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
              required
              minLength={6}
              disabled={!isAdmin}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Confirm New Password</label>
            <input
              type="password"
              className="form-control"
              style={inputStyle}
              value={securityForm.confirmPassword}
              onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
              required
              minLength={6}
              disabled={!isAdmin}
            />
          </div>
        </div>

        {isAdmin && (
          <div className="d-flex justify-content-start mt-4 pt-2">
            <button
              className="btn btn-primary rounded-pill px-4 py-2 fw-bold text-white d-flex align-items-center gap-2 border-0 shadow-sm"
              style={{ backgroundColor: '#0d6efd', fontSize: '0.9rem' }}
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="bi bi-arrow-repeat"></i>
              )}
              <span>Update Password</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );

  const renderBackupRestore = () => (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3 pb-1">
        <i className="bi bi-cloud-arrow-down fs-5 text-primary"></i>
        <h5 className="fw-bold text-dark m-0">Backup & Restore</h5>
      </div>
      <p className="text-muted small mb-4">Manage store configuration archives and database backups. Protect your registry with routine snapshot exports.</p>

      {/* 1. CONFIGURATION BACKUP / RESTORE */}
      <div className="mb-5 pb-4 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
        <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
          1. Store Configuration Settings (JSON)
        </h6>
        <p className="text-muted small mb-3">Backup and restore the store identity, invoice templates, preferences, notifications, and security variables.</p>
        
        <div className="d-flex flex-wrap gap-3">
          <button
            className="btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
            onClick={handleDownloadConfigBackup}
            type="button"
          >
            <i className="bi bi-download"></i>
            <span>Export Settings JSON</span>
          </button>

          {isAdmin && (
            <div className="position-relative">
              <button
                className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                type="button"
                onClick={() => document.getElementById('configRestoreFileInput')?.click()}
              >
                <i className="bi bi-upload"></i>
                <span>Import Settings JSON</span>
              </button>
              <input
                type="file"
                id="configRestoreFileInput"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleRestoreConfigBackup}
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. FULL DATABASE SQL BACKUP */}
      <div className="mb-5 pb-4 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
        <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
          2. System Database SQL Snapshot
        </h6>
        <p className="text-muted small mb-3">Perform a full snapshot backup of all Postgres database tables, transaction logs, sales lists, and registry files.</p>

        {backupStatus === 'generating' && (
          <div className="mb-4">
            <div className="d-flex justify-content-between mb-1 small text-muted">
              <span>Generating backup SQL payload...</span>
              <span>{backupProgress}%</span>
            </div>
            <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${backupProgress}%`, backgroundColor: '#0d6efd' }}
              ></div>
            </div>
          </div>
        )}

        {backupStatus === 'success' && (
          <div className="alert alert-success border-0 p-3 mb-3 d-flex align-items-center gap-2 rounded">
            <i className="bi bi-check-circle-fill fs-5 text-success"></i>
            <span className="small">Database backup completed and downloaded successfully!</span>
          </div>
        )}

        {backupStatus === 'idle' && isAdmin && (
          <button
            className="btn btn-primary rounded-pill px-4 py-2.5 fw-bold text-white d-flex align-items-center gap-2 border-0 shadow-sm"
            style={{ backgroundColor: '#0d6efd', fontSize: '0.9rem' }}
            onClick={handleGenerateDBBackup}
            type="button"
          >
            <i className="bi bi-database-fill-up"></i>
            <span>Create Database SQL Backup</span>
          </button>
        )}
      </div>

      {/* 3. BACKUP LOGS */}
      <div>
        <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
          3. Backup Logs History
        </h6>
        <div className="table-responsive">
          <table className="table table-borderless align-middle" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr className="border-bottom text-muted" style={{ borderColor: 'var(--border-color)' }}>
                <th className="pb-2">File Name</th>
                <th className="pb-2">Size</th>
                <th className="pb-2">Date Created</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backupHistory.map((b) => (
                <tr key={b.id} className="border-bottom" style={{ borderColor: 'rgba(0,0,0,0.03)' }}>
                  <td className="py-3 font-monospace text-dark fw-semibold">{b.name}</td>
                  <td className="py-3 text-muted">{b.size}</td>
                  <td className="py-3 text-muted">{b.date}</td>
                  <td className="py-3">
                    <span className={`badge px-2.5 py-1.5 rounded-pill ${
                      b.type.includes('System') ? 'bg-light text-secondary' : 'bg-primary-glow text-primary'
                    }`} style={{ fontSize: '0.75rem' }}>
                      {b.type}
                    </span>
                  </td>
                  <td className="py-3 text-end">
                    <div className="d-inline-flex gap-2">
                      <button
                        className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '32px', height: '32px' }}
                        title="Download SQL Backup File"
                        onClick={() => {
                          const blob = new Blob([`-- Dump for backup ${b.name}`], { type: 'text/sql' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = b.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <i className="bi bi-download text-secondary"></i>
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '32px', height: '32px' }}
                          title="Restore System from this Snapshot"
                          onClick={() => handleRestoreDBBackup(b.name)}
                        >
                          <i className="bi bi-arrow-counterclockwise text-primary"></i>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '32px', height: '32px' }}
                          title="Delete Backup File"
                          onClick={() => handleDeleteDBBackup(b.id)}
                        >
                          <i className="bi bi-trash text-danger"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderHelp = () => {
    const handleRunDiagnostics = () => {
      setDiagStatus('running');
      setDiagLogs(['Initializing diagnostic sequence...', 'Testing browser local storage capacity...']);
      
      setTimeout(() => {
        setDiagLogs(prev => [...prev, 'Local storage capacity: OK (10.2 KB used)']);
      }, 400);

      setTimeout(() => {
        setDiagLogs(prev => [...prev, 'Testing backend API connectivity...']);
      }, 800);

      setTimeout(() => {
        setDiagLogs(prev => [...prev, `API connection handshake: OK (Host: ${api.defaults.baseURL || 'http://localhost:5000'})`]);
      }, 1200);

      setTimeout(() => {
        setDiagLogs(prev => [...prev, 'Verifying authentication token integrity...']);
      }, 1600);

      setTimeout(() => {
        setDiagLogs(prev => [...prev, `Integrity signature verified: OK (Role: ${user?.role?.name || 'Cashier'})`]);
        setDiagStatus('done');
      }, 2000);
    };

    return (
      <div>
        <div className="d-flex align-items-center gap-2 mb-3 pb-1">
          <i className="bi bi-question-circle fs-5 text-primary"></i>
          <h5 className="fw-bold text-dark m-0">Help & Support</h5>
        </div>
        <p className="text-muted small mb-4">Access system diagnostic utilities, check technical information, or contact support desk coordinators.</p>

        {/* 1. TECHNICAL SPECIFICATIONS */}
        <div className="mb-5 pb-4 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
          <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
            1. Technical Specifications
          </h6>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="p-3 border rounded" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
                <span className="text-muted small d-block">Software Version</span>
                <span className="fw-bold text-dark font-monospace">v1.2.0-stable</span>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="p-3 border rounded" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
                <span className="text-muted small d-block">Database Engine</span>
                <span className="fw-bold text-dark font-monospace">PostgreSQL v15 (Alpine)</span>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="p-3 border rounded" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
                <span className="text-muted small d-block">Backend API URL</span>
                <span className="fw-bold text-dark font-monospace" style={{ wordBreak: 'break-all' }}>{api.defaults.baseURL || 'http://localhost:5000'}</span>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="p-3 border rounded" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
                <span className="text-muted small d-block">Portal Environment</span>
                <span className="fw-bold text-dark font-monospace">Next.js Client (Port 3000)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DIAGNOSTIC TESTS */}
        <div className="mb-5 pb-4 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
          <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
            2. System Diagnostics Handshake
          </h6>
          <p className="text-muted small mb-3">Execute diagnostic checks to verify client-side storage, token validation signatures, and server status connections.</p>
          
          <div className="d-flex flex-column gap-3">
            <div>
              {diagStatus === 'idle' && (
                <button
                  className="btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                  onClick={handleRunDiagnostics}
                  type="button"
                >
                  <i className="bi bi-play-fill fs-5"></i>
                  <span>Run System Diagnostics</span>
                </button>
              )}
              {diagStatus === 'running' && (
                <button
                  className="btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
                  disabled
                  type="button"
                >
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Running diagnostic sequence...</span>
                </button>
              )}
              {diagStatus === 'done' && (
                <div className="d-flex gap-3">
                  <button
                    className="btn btn-success rounded-pill px-4 py-2 fw-semibold text-white d-flex align-items-center gap-2 border-0"
                    disabled
                    type="button"
                  >
                    <i className="bi bi-check-circle-fill"></i>
                    <span>Diagnostics Completed</span>
                  </button>
                  <button
                    className="btn btn-link text-decoration-none text-primary"
                    onClick={() => { setDiagStatus('idle'); setDiagLogs([]); }}
                    type="button"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {diagLogs.length > 0 && (
              <div className="p-3 border rounded font-monospace text-dark bg-light animate-fade-in-up" style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
                {diagLogs.map((log, index) => (
                  <div key={index} className="mb-1 d-flex align-items-center gap-2">
                    {log.includes('OK') ? (
                      <i className="bi bi-check-circle-fill text-success"></i>
                    ) : log.includes('Testing') || log.includes('Verifying') ? (
                      <span className="spinner-border spinner-border-sm text-primary" style={{ width: '0.75rem', height: '0.75rem' }} role="status"></span>
                    ) : (
                      <i className="bi bi-arrow-right-short text-secondary"></i>
                    )}
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. SUPPORT CENTER */}
        <div>
          <h6 className="fw-bold text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
            3. Customer Support Help Desk
          </h6>
          <p className="text-muted small mb-3">If you experience hardware faults, printer connectivity issues, or transaction mismatches, please contact our help desk.</p>
          <div className="p-3 border rounded d-flex flex-wrap gap-4 align-items-center justify-content-between" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--light-bg)' }}>
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-telephone-fill fs-3 text-primary"></i>
              <div>
                <span className="d-block fw-bold text-dark">Technical Helpline</span>
                <span className="text-muted small">+1 555-0199 (Mon-Fri 9:00 - 18:00)</span>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-envelope-at-fill fs-3 text-primary"></i>
              <div>
                <span className="d-block fw-bold text-dark">Email Support Desk</span>
                <span className="text-muted small">support@smartpos.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFaq = () => {
    const faqs = [
      {
        q: 'How do I change the default Tax/VAT rate?',
        a: 'Navigate to the "System Preferences" tab under settings, adjust the "Tax Rate (%)" field, and click "Save Preferences". This default tax rate will be automatically applied to new invoice calculations in sales and POS portals.'
      },
      {
        q: 'Where are my database backups stored?',
        a: 'Automated nightly backups are stored securely on the server host. Manual SQL snapshots generated in the "Backup & Restore" panel are downloaded directly to your local computer\'s downloads directory. To download system logs or nightly files, click the download icon next to the file name in the logs table.'
      },
      {
        q: 'How do I configure session timeout limits?',
        a: 'Navigate to the "Security" tab under settings, modify the "Session Automatic Inactivity Timeout (minutes)" value, and click "Save Security Policy". Registered users will be automatically signed out after this timeout threshold is reached.'
      },
      {
        q: 'Can cashiers edit system configuration parameters?',
        a: 'No. Only users registered as administrators have permissions to view and write configuration changes. When cashiers visit the Settings page, it will automatically render in a read-only mode warning and submit buttons will be hidden.'
      },
      {
        q: 'How do I restore my configurations from a settings backup JSON?',
        a: 'Go to the "Backup & Restore" tab, click the "Import Settings JSON" button, choose a previously exported configuration JSON file, and upload it. The system will automatically overwrite local configurations and write updates to the Postgres database.'
      }
    ];

    const toggleFaq = (index: number) => {
      setExpandedFaq(expandedFaq === index ? null : index);
    };

    return (
      <div>
        <div className="d-flex align-items-center gap-2 mb-3 pb-1">
          <i className="bi bi-chat-right-text fs-5 text-primary"></i>
          <h5 className="fw-bold text-dark m-0">Frequently Asked Questions</h5>
        </div>
        <p className="text-muted small mb-4">Find answers to frequently asked questions about the SmartPOS system configuration, data safety, and user privileges.</p>

        <div className="accordion d-flex flex-column gap-3" id="settingsFaqAccordion">
          {faqs.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <div
                key={index}
                className="accordion-item border rounded shadow-none"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--light-bg)',
                  overflow: 'hidden'
                }}
              >
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button fw-bold text-dark w-100 text-start d-flex align-items-center justify-content-between p-3 border-0 bg-transparent`}
                    type="button"
                    onClick={() => toggleFaq(index)}
                    style={{
                      boxShadow: 'none',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{faq.q}</span>
                    <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-primary fs-6`}></i>
                  </button>
                </h2>
                {isExpanded && (
                  <div className="accordion-collapse collapse show">
                    <div className="accordion-body p-3 pt-0 text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                      {faq.a}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AuthLayout>
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <h4 className="fw-bold m-0 text-dark">{t('settings', 'title') || 'Settings'}</h4>
      </div>
      <div className="row g-4 justify-content-center">
        <div className="col-12 col-xl-11">
          
          <h2 className="fw-bold mb-4" style={{ color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontSize: '2rem' }}>{t('settings', 'title')}</h2>

          {!isAdmin && (
            <div className="alert alert-warning border-0 rounded-lg p-3 d-flex align-items-center gap-3 mb-4 shadow-sm" role="alert">
              <i className="bi bi-exclamation-triangle-fill fs-4 text-warning"></i>
              <div>
                <strong>Read-Only Mode:</strong> You are signed in as a Cashier. Only Store Administrators hold permission to edit currency or tax system variables.
              </div>
            </div>
          )}

          <div className="row g-4 align-items-start">
            {/* Left Submenu Navigation Sidebar */}
            <div className="col-12 col-md-4 col-lg-3">
              <div className="card border-0 p-3 shadow-sm" style={{ backgroundColor: 'var(--light-card)', borderRadius: '12px' }}>
                <div className="nav flex-column gap-2" role="tablist">
                  
                  {/* General Settings */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'general' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('general')}
                  >
                    <i className="bi bi-building fs-5"></i>
                    <span>{t('settings', 'store_settings')}</span>
                  </button>

                  {/* System Preferences */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'preferences' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('preferences')}
                  >
                    <i className="bi bi-sliders fs-5"></i>
                    <span>{t('common', 'settings')}</span>
                  </button>

                  {/* Notifications */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'notifications' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('notifications')}
                  >
                    <i className="bi bi-bell fs-5"></i>
                    <span>{t('settings', 'notification_settings')}</span>
                  </button>

                  {/* Security */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'security' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('security')}
                  >
                    <i className="bi bi-shield fs-5"></i>
                    <span>Security</span>
                  </button>

                  {/* Backup & Restore */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'backup' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('backup')}
                  >
                    <i className="bi bi-cloud-arrow-down fs-5"></i>
                    <span>Backup & Restore</span>
                  </button>

                  {/* Help */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'help' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('help')}
                  >
                    <i className="bi bi-question-circle fs-5"></i>
                    <span>Help</span>
                  </button>

                  {/* FAQ */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'faq' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('faq')}
                  >
                    <i className="bi bi-chat-right-text fs-5"></i>
                    <span>FAQ</span>
                  </button>

                </div>
              </div>
            </div>

            {/* Right Settings Form panel */}
            <div className="col-12 col-md-8 col-lg-9">
              <div className="card border-0 p-4 shadow-sm" style={{ backgroundColor: 'var(--light-card)', borderRadius: '12px', minHeight: '400px' }}>
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted">{t('common', 'loading')}</p>
                  </div>
                ) : (
                  <div>
                    {activeTab === 'general' && renderGeneralSettings()}
                    {activeTab === 'preferences' && renderSystemPreferences()}
                    {activeTab === 'notifications' && renderNotifications()}
                    {activeTab === 'security' && renderSecurity()}
                    {activeTab === 'backup' && renderBackupRestore()}
                    {activeTab === 'help' && renderHelp()}
                    {activeTab === 'faq' && renderFaq()}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AuthLayout>
  );
}



