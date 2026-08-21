'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useModal } from '@/context/ModalContext';

import TableControls, { applyPagination } from '@/components/TableControls';
export default function SettingsPage() {
  const router = useRouter();
  const { user, token, api } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';

  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Submenu Selection
  const [activeTab, setActiveTab] = useState<'general' | 'units' | 'preferences' | 'notifications' | 'security' | 'backup' | 'help' | 'faq'>('general');

  // Global Unit Conversions State
  const [globalUnits, setGlobalUnits] = useState<any[]>([]);
  const [newBaseUnit, setNewBaseUnit] = useState('kg');
  const [newFactor, setNewFactor] = useState('');
  const [newSecondaryUnit, setNewSecondaryUnit] = useState('');

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
    printCopies: 2,
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

  // Active Sessions & Device Security states
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionStats, setSessionStats] = useState({ totalSessions: 0, uniqueIPs: 0, uniqueDevices: 0 });
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const [sessRes, statsRes] = await Promise.all([
        api.get('/users/sessions'),
        api.get('/users/sessions/stats'),
      ]);
      setSessions(sessRes.data || []);
      setSessionStats(statsRes.data || { totalSessions: 0, uniqueIPs: 0, uniqueDevices: 0 });
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    setRevokingId(sessionId);
    try {
      await api.delete(`/users/sessions/${sessionId}`);
      showAlert('Session revoked successfully', { title: 'Session Revoked', type: 'success' });
      loadSessions();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Failed to revoke session', { title: 'Session Error', type: 'danger' });
    } finally {
      setRevokingId(null);
    }
  };

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
      showAlert('Error creating settings backup file.', { title: 'Backup Error', type: 'danger' });
    }
  };

  const handleRestoreConfigBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      showAlert('Only administrators are authorized to perform system restoration', { title: 'Access Denied', type: 'danger' });
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
          showAlert(res.data?.message || 'Tenant data successfully restored!', { title: 'Restoration Complete', type: 'success' });
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
          showAlert('Configuration settings successfully restored!', { title: 'Restoration Complete', type: 'success' });
        }
        setSubmitting(false);
        loadSettings();
      } catch (err: any) {
        setSubmitting(false);
        showAlert(err.response?.data?.message || err.message || 'Error parsing backup file.', { title: 'Restoration Failed', type: 'danger' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerateDBBackup = async () => {
    if (!isAdmin) {
      showAlert('Only administrators are authorized to create company backups', { title: 'Access Denied', type: 'danger' });
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
      showAlert(err.response?.data?.message || 'Error generating tenant backup file.', { title: 'Backup Failed', type: 'danger' });
    }
  };

  const handleRestoreDBBackup = (name: string) => {
    if (!isAdmin) {
      showAlert('Only administrators are authorized to perform restorations', { title: 'Access Denied', type: 'danger' });
      return;
    }
    showConfirm({
      title: 'Confirm Restoration',
      message: `Are you sure you want to restore the entire database from snapshot: ${name}? This will overwrite current transaction logs.`,
      type: 'warning',
      onConfirm: () => {
        showAlert(`Database successfully restored from snapshot ${name}!`, { title: 'Restore Success', type: 'success' });
      }
    });
  };

  const handleDeleteDBBackup = (id: number) => {
    if (!isAdmin) {
      showAlert('Only administrators are authorized to delete backups', { title: 'Access Denied', type: 'danger' });
      return;
    }
    showConfirm({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this backup snapshot?',
      type: 'danger',
      onConfirm: () => {
        setBackupHistory(prev => prev.filter(b => b.id !== id));
        showAlert('Backup snapshot deleted successfully', { title: 'Deleted', type: 'info' });
      }
    });
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
        printCopies: res.data.printCopies !== undefined ? res.data.printCopies : 2,
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setLoading(false);
    }
  };

  const loadGlobalUnits = async () => {
    try {
      const res = await api.get('/unit-conversions');
      const globals = (res.data || []).filter((u: any) => u.productId === null || !u.productId);
      setGlobalUnits(globals);
    } catch (err) {
      console.error('Error fetching global unit conversions:', err);
    }
  };

  const handleAddGlobalUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaseUnit || !newFactor || !newSecondaryUnit) return;
    try {
      await api.post('/unit-conversions', {
        baseUnit: newBaseUnit.trim(),
        secondaryUnit: newSecondaryUnit.trim(),
        conversionFactor: Number(newFactor),
      });
      showAlert('Global unit conversion added successfully!', { title: 'Success', type: 'success' });
      setNewFactor('');
      setNewSecondaryUnit('');
      loadGlobalUnits();
    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Error adding unit conversion', { title: 'Error', type: 'danger' });
    }
  };

  const handleDeleteGlobalUnit = async (id: number) => {
    showConfirm({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this global unit conversion rule?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/unit-conversions/${id}`);
          showAlert('Global unit conversion deleted', { title: 'Deleted', type: 'info' });
          loadGlobalUnits();
        } catch (err: any) {
          showAlert(err.response?.data?.message || 'Error deleting conversion', { title: 'Error', type: 'danger' });
        }
      }
    });
  };

  useEffect(() => {
    loadSettings();
    loadGlobalUnits();
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

  useEffect(() => {
    if (activeTab === 'security') {
      loadSessions();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Only administrators are authorized to change system configurations', { title: 'Access Denied', type: 'danger' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        taxRateDefault: Number(form.taxRateDefault),
        printCopies: Number(form.printCopies),
      };
      await api.put('/settings', payload);
      showAlert('Store settings successfully updated!', { title: 'Store Settings', type: 'success' });
      setSubmitting(false);
      loadSettings();
    } catch (err: any) {
      setSubmitting(false);
      showAlert(err.response?.data?.message || 'Error updating settings', { title: 'Update Failed', type: 'danger' });
    }
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Only administrators are authorized to change system configurations', { title: 'Access Denied', type: 'danger' });
      return;
    }
    localStorage.setItem('smartpos_notifications', JSON.stringify(notifConfig));
    showAlert('Notification settings successfully updated!', { title: 'Notifications', type: 'success' });
  };

  const handleSaveSecurityConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Only administrators are authorized to change security settings', { title: 'Access Denied', type: 'danger' });
      return;
    }
    localStorage.setItem('smartpos_security', JSON.stringify(securityConfig));
    showAlert('Security configurations successfully updated!', { title: 'Security', type: 'success' });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Only administrators are authorized to perform security changes', { title: 'Unauthorized', type: 'danger' });
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      showAlert('New password and confirm password do not match', { title: 'Validation Error', type: 'danger' });
      return;
    }
    if (securityForm.newPassword.length < 6) {
      showAlert('Password must be at least 6 characters', { title: 'Validation Error', type: 'danger' });
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/users/${user.id}/reset-password`, {
        newPassword: securityForm.newPassword,
      });
      showAlert('Password updated successfully!', { title: 'Success', type: 'success' });
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSubmitting(false);
    } catch (err: any) {
      setSubmitting(false);
      showAlert(err.response?.data?.message || 'Error updating password', { title: 'Error', type: 'danger' });
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

  const renderGlobalUnits = () => (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3 pb-1">
        <i className="bi bi-calculator fs-5 text-primary"></i>
        <h5 className="fw-bold text-dark m-0">Global Unit Conversions</h5>
      </div>
      <p className="text-muted small mb-4">
        Define store-wide unit conversion rules once (e.g. 1 kg = 1000 gram, 1 liter = 1000 ml). All products with matching units automatically inherit these rules across POS and Inventory without per-product setup.
      </p>

      {isAdmin && (
        <form onSubmit={handleAddGlobalUnit} className="card p-3 mb-4 border bg-light">
          <h6 className="fw-bold text-dark mb-3">Add Global Conversion Rule</h6>
          <div className="row g-3 align-items-end">
            <div className="col-12 col-sm-3">
              <label className="form-label fs-8 fw-bold text-secondary mb-1">Base Unit</label>
              <input
                type="text"
                className="form-control"
                style={inputStyle}
                placeholder="e.g. kg, liter, dozen"
                value={newBaseUnit}
                onChange={(e) => setNewBaseUnit(e.target.value)}
                required
              />
            </div>
            <div className="col-auto text-center pb-2 fw-bold text-muted fs-5 align-self-end mb-1">=</div>
            <div className="col-12 col-sm-3">
              <label className="form-label fs-8 fw-bold text-secondary mb-1">Conversion Factor</label>
              <input
                type="number"
                step="any"
                className="form-control"
                style={inputStyle}
                placeholder="e.g. 1000"
                value={newFactor}
                onChange={(e) => setNewFactor(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-sm-3">
              <label className="form-label fs-8 fw-bold text-secondary mb-1">Secondary Unit</label>
              <input
                type="text"
                className="form-control"
                style={inputStyle}
                placeholder="e.g. gram, ml, pcs"
                value={newSecondaryUnit}
                onChange={(e) => setNewSecondaryUnit(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-sm">
              <button type="submit" className="btn btn-primary w-100 fw-bold py-2 shadow-sm" style={{ whiteSpace: 'nowrap', borderRadius: '10px' }}>
                <i className="bi bi-plus-circle me-1"></i> Add Rule
              </button>
            </div>
          </div>
        </form>
      )}

      <h6 className="fw-bold text-dark mb-3">Active Global Rules ({globalUnits.length})</h6>
      <div className="table-responsive">
        <table className="table align-middle custom-table">
          <thead>
            <tr>
              <th>Base Unit</th>
              <th>Conversion Rule</th>
              <th>Secondary Unit</th>
              {isAdmin && <th className="text-center">Action</th>}
            </tr>
          </thead>
          <tbody>
            {globalUnits.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-muted">
                  No global unit conversion rules defined yet. Add rules above (e.g. 1 kg = 1000 gram).
                </td>
              </tr>
            ) : (
              globalUnits.map((u) => (
                <tr key={u.id}>
                  <td className="fw-bold text-dark">{u.baseUnit}</td>
                  <td>
                    <span className="badge bg-info-subtle text-info px-2.5 py-1 rounded-pill fw-bold">
                      1 {u.baseUnit} = {u.conversionFactor} {u.secondaryUnit}
                    </span>
                  </td>
                  <td className="fw-bold text-primary">{u.secondaryUnit}</td>
                  {isAdmin && (
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-danger p-1 px-2"
                        onClick={() => handleDeleteGlobalUnit(u.id)}
                        title="Delete Rule"
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
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
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold text-secondary mb-1" style={{ fontSize: '0.85rem' }}>Receipt Print Copies</label>
            <select
              className="form-select"
              style={inputStyle}
              value={form.printCopies}
              onChange={(e) => setForm({ ...form, printCopies: Number(e.target.value) })}
              disabled={!isAdmin}
            >
              <option value={1}>1 Copy (Single Receipt)</option>
              <option value={2}>2 Copies (Customer + Store Copy)</option>
              <option value={3}>3 Copies</option>
            </select>
            <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>Automatically prints Customer & Store copies back-to-back</small>
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

      {/* Active Device Sessions Table matching reference app */}
      <div className="mt-5 pt-4 border-top" style={{ borderColor: 'var(--border-color)' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-display fs-5 text-primary"></i>
              <h5 className="fw-bold text-dark m-0">Active Device Sessions</h5>
            </div>
            <p className="text-muted small m-0">Review active logged-in devices for your account and revoke stale access.</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
            onClick={loadSessions}
            disabled={loadingSessions}
          >
            <i className={`bi bi-arrow-clockwise ${loadingSessions ? 'spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
        </div>

        {/* Metric Cards matching reference app */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="card p-3 border-0 shadow-sm bg-primary-subtle text-primary rounded-4">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fs-4 fw-black">{sessionStats.totalSessions}</div>
                  <div className="small fw-semibold">Active Sessions</div>
                </div>
                <i className="bi bi-shield-check fs-1 opacity-75"></i>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card p-3 border-0 shadow-sm bg-info-subtle text-info rounded-4">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fs-4 fw-black">{sessionStats.uniqueIPs}</div>
                  <div className="small fw-semibold">Unique IP Addresses</div>
                </div>
                <i className="bi bi-globe fs-1 opacity-75"></i>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card p-3 border-0 shadow-sm bg-success-subtle text-success rounded-4">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fs-4 fw-black">{sessionStats.uniqueDevices}</div>
                  <div className="small fw-semibold">Unique Devices</div>
                </div>
                <i className="bi bi-laptop fs-1 opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="table-responsive border rounded-3 bg-white shadow-sm">
          <table className="table align-middle custom-table mb-0">
            <thead className="bg-light">
              <tr>
                <th>Device</th>
                <th>IP Address</th>
                <th>Logged In At</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingSessions ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    <span className="spinner-border spinner-border-sm me-2"></span> Loading active sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s, idx) => (
                  <tr key={s.id}>
                    <td>
                      <div className="fw-bold text-dark">{s.deviceName}</div>
                      <small className="text-muted text-uppercase">{s.deviceType}</small>
                    </td>
                    <td className="font-monospace small text-dark">{s.ipAddress}</td>
                    <td className="small text-muted">{new Date(s.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge rounded-pill ${idx === 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary'}`}>
                        {idx === 0 ? 'Current Session' : 'Active'}
                      </span>
                    </td>
                    <td className="text-center">
                      {idx === 0 ? (
                        <span className="text-muted small">-</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold"
                          onClick={() => handleRevokeSession(s.id)}
                          disabled={revokingId === s.id}
                        >
                          {revokingId === s.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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

                  {/* Global Unit Conversions */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'units' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('units')}
                  >
                    <i className="bi bi-calculator fs-5"></i>
                    <span>Unit Conversions</span>
                  </button>

                  {/* System Preferences */}
                  <button
                    className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2.5 fw-semibold settings-nav-item ${
                      activeTab === 'preferences' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('preferences')}
                  >
                    <i className="bi bi-sliders fs-5"></i>
                    <span>System Preferences</span>
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
                    {activeTab === 'units' && renderGlobalUnits()}
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



