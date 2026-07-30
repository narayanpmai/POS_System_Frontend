'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useModal } from '@/context/ModalContext';
import { formatAdToBs } from '@/utils/nepaliDate';

import TableControls, { applyPagination } from '@/components/TableControls';

export default function UserControlPage() {
  const router = useRouter();
  const { token, api, user } = useAuth();
  const { t } = useLanguage();
  const { showAlert } = useModal();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: 2, // Default to cashier
    companyId: '',
    active: true,
  });

  // Password reset state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!token) return;
    if (user && user.role.name !== 'Admin' && user.role.name !== 'Super Admin') {
      window.location.href = '/dashboard';
      return;
    }
    loadData();
  }, [token, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);

      if (user?.role?.name === 'Super Admin') {
        const compRes = await api.get('/companies');
        setCompanies(compRes.data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddClick = () => {
    setFormData({ name: '', email: '', password: '', roleId: roles.find(r => r.name === 'Cashier')?.id || 2, companyId: '', active: true });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditClick = (u: any) => {
    setFormData({ name: u.name, email: u.email, password: '', roleId: u.roleId, companyId: u.companyId || '', active: u.active });
    setEditingUserId(u.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // Prepare data (only include password if typed)
        const payload: any = { ...formData };
        if (payload.companyId) payload.companyId = parseInt(payload.companyId as string);
        else delete payload.companyId;
        
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editingUserId}`, payload);
        showAlert(t('users', 'success_update') || 'User updated successfully', { type: 'success', title: 'User Updated' });
      } else {
        if (!formData.password) return showAlert('Password is required for new users', { type: 'warning', title: 'Validation Warning' });
        const payload: any = { ...formData };
        if (payload.companyId) payload.companyId = parseInt(payload.companyId as string);
        else delete payload.companyId;

        await api.post('/users', payload);
        showAlert(t('users', 'success_add') || 'User created successfully', { type: 'success', title: 'User Created' });
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('common', 'error'), { type: 'danger', title: 'Operation Failed' });
    }
  };

  const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.put(`/users/${id}`, { active: !currentStatus });
      loadData();
    } catch (err) {
      showAlert('Error updating status', { type: 'danger', title: 'Error' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return showAlert('Password must be at least 6 characters', { type: 'warning', title: 'Validation Warning' });
    try {
      await api.patch(`/users/${resetUserId}/reset-password`, { newPassword });
      showAlert(t('common', 'updated_successfully') || 'Password reset successfully', { type: 'success', title: 'Password Reset' });
      setShowResetModal(false);
      setNewPassword('');
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('common', 'error'), { type: 'danger', title: 'Reset Failed' });
    }
  };

  return (
    <AuthLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <h2 className="mb-0">{t('users', 'title')}</h2>
        </div>
        <button className="btn btn-primary fw-bold px-4" onClick={handleAddClick}>
          <i className="bi bi-plus-lg me-2"></i>{t('users', 'add_user')}
        </button>
      </div>

      {showForm && (
        <div className="card p-4 border-none shadow-sm mb-4" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
          <h5 className="fw-bold mb-3">{isEditing ? t('users', 'edit_user') : t('users', 'add_user')}</h5>
          <form onSubmit={submitForm}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('users', 'user_name')}</label>
                <input required type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('users', 'user_email')}</label>
                <input required type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('auth', 'password')} {isEditing && <small className="text-muted">(Leave blank to keep unchanged)</small>}</label>
                <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('users', 'user_role')}</label>
                <select className="form-select" value={formData.roleId} onChange={e => setFormData({...formData, roleId: parseInt(e.target.value)})}>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {user?.role?.name === 'Super Admin' && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Assign Company (Super Admin only)</label>
                  <select className="form-select" value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})}>
                    <option value="">Select Company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-light border px-4" onClick={() => setShowForm(false)}>{t('common', 'cancel')}</button>
              <button type="submit" className="btn btn-primary px-4 fw-bold">
                {t('users', 'save_user')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal Simulator */}
      {showResetModal && (
        <div className="card p-4 border-none shadow-sm mb-4 border-danger" style={{ backgroundColor: '#fff5f5' }}>
          <h5 className="text-danger fw-bold mb-3"><i className="bi bi-shield-lock-fill me-2"></i>Force Reset Password</h5>
          <form onSubmit={handleResetPassword}>
            <div className="mb-3">
              <label className="form-label fw-semibold">{t('auth', 'password') || 'New Password'}</label>
              <input required type="password" minLength={6} className="form-control w-50" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button type="button" className="btn btn-light border" onClick={() => setShowResetModal(false)}>{t('common', 'cancel')}</button>
              <button type="submit" className="btn btn-danger fw-bold">{t('common', 'save') || 'Confirm Reset'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-4 border-none shadow-sm" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
        <h5 className="fw-bold mb-3">{t('users', 'title')}</h5>
        <div className="table-responsive">
          <table className="table custom-table align-middle">
            <thead>
              <tr>
                <th>{t('users', 'user_name')}</th>
                <th>{t('users', 'user_email')}</th>
                {user?.role?.name === 'Super Admin' && <th>Company</th>}
                <th>{t('users', 'user_role')}</th>
                <th>{t('common', 'status')}</th>
                <th>{t('common', 'date')}</th>
                <th className="text-end">{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">Loading users...</td></tr>
              ) : applyPagination(users, currentPage, rowsPerPage).map((u , index) => (
                <tr key={u.id}>
                  <td className="fw-bold">{u.name}</td>
                  <td>{u.email}</td>
                  {user?.role?.name === 'Super Admin' && <td>{u.company?.name || '-'}</td>}
                  <td>
                    <span className={`badge px-2 py-1 rounded-pill ${u.role.name === 'Admin' ? 'bg-danger-subtle text-danger' : u.role.name === 'Manager' ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary'}`}>
                      {u.role.name}
                    </span>
                  </td>
                  <td>
                    {u.active ? (
                      <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1 rounded-pill"><i className="bi bi-check-circle-fill me-1"></i>{t('common', 'active')}</span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill"><i className="bi bi-slash-circle-fill me-1"></i>{t('common', 'inactive')}</span>
                    )}
                  </td>
                  <td>{formatAdToBs(u.createdAt)}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => {
                      setResetUserId(u.id);
                      setShowResetModal(true);
                    }} title="Reset Password">
                      <i className="bi bi-key-fill"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEditClick(u)} title="Edit">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className={`btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => toggleActiveStatus(u.id, u.active)} title={u.active ? 'Deactivate' : 'Activate'}>
                      <i className={`bi ${u.active ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TableControls 
          totalItems={users.length} 
          rowsPerPage={rowsPerPage} 
          currentPage={currentPage} 
          onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }} 
          onPageChange={setCurrentPage} 
        />
      </div>
    </AuthLayout>
  );
}
