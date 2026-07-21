'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBs } from '@/utils/nepaliDate';

export default function UserControlPage() {
  const { token, api, user } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: 2, // Default will be updated when roles are fetched
    active: true,
  });

  // Password reset state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Super Admin filtering
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  useEffect(() => {
    if (user && user.companyId && !selectedCompanyId) {
      setSelectedCompanyId(String(user.companyId));
    }
  }, [user, selectedCompanyId]);

  useEffect(() => {
    if (user?.role?.name === 'Super Admin') {
      const fetchCompanies = async () => {
        try {
          const res = await api.get('/companies');
          setCompanies(res.data);
        } catch (err) {
          console.error('Failed to fetch companies', err);
        }
      };
      fetchCompanies();
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;
    if (user && user.role.name !== 'Admin' && user.role.name !== 'Super Admin') {
      window.location.href = '/dashboard';
      return;
    }
    loadData();
  }, [token, user, selectedCompanyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const query = selectedCompanyId ? `?companyId=${selectedCompanyId}` : '';
      const [usersRes, rolesRes] = await Promise.all([
        api.get(`/users${query}`),
        api.get('/users/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddClick = () => {
    const defaultRole = roles.find(r => r.name === 'Cashier') || roles[0];
    const defaultRoleId = defaultRole ? defaultRole.id : 2;
    setFormData({ name: '', email: '', password: '', roleId: defaultRoleId, active: true });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditClick = (u: any) => {
    setFormData({ name: u.name, email: u.email, password: '', roleId: u.roleId, active: u.active });
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
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editingUserId}`, payload);
        alert(t('users', 'success_update') || 'User updated successfully');
      } else {
        if (!formData.password) return alert('Password is required for new users');
        await api.post('/users', formData);
        alert(t('users', 'success_add') || 'User created successfully');
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.put(`/users/${id}`, { active: !currentStatus });
      loadData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return alert('Password must be at least 6 characters');
    try {
      await api.patch(`/users/${resetUserId}/reset-password`, { newPassword });
      alert(t('common', 'updated_successfully') || 'Password reset successfully');
      setShowResetModal(false);
      setNewPassword('');
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  return (
    <AuthLayout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h4 className="fw-bold m-0">{t('users', 'title')}</h4>
        
        <div className="d-flex gap-3">
          {user?.role?.name === 'Super Admin' && (
            <select
              className="form-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              <option disabled value="">{t('common', 'select_company') || 'Select Company'}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button className="btn btn-primary fw-bold px-4 text-nowrap" onClick={handleAddClick}>
            <i className="bi bi-plus-lg me-1"></i> {t('users', 'add_user')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-4 border-none shadow-sm mb-4" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
          <h5 className="fw-bold mb-4">{isEditing ? t('users', 'edit_user') : t('users', 'new_user')}</h5>
          <form onSubmit={submitForm}>
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">{t('users', 'user_name')}</label>
                <input required type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">{t('users', 'user_email')}</label>
                <input required type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              
              {!isEditing && (
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">{t('auth', 'password') || 'Initial Password'}</label>
                  <input required type="password" minLength={6} className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              )}

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">{t('users', 'user_role')}</label>
                <select className="form-select" value={formData.roleId} onChange={e => setFormData({...formData, roleId: parseInt(e.target.value)})}>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>
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
            <div className="d-flex flex-wrap gap-2">
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
                <th>{t('users', 'user_role')}</th>
                <th>{t('common', 'status')}</th>
                <th>{t('common', 'date')}</th>
                <th className="text-end">{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">Loading users...</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td className="fw-bold">{u.name}</td>
                  <td>{u.email}</td>
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
                      setShowForm(false);
                    }}>
                      <i className="bi bi-key-fill"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEditClick(u)}>
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button 
                      className={`btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-outline-success'}`} 
                      onClick={() => toggleActiveStatus(u.id, u.active)}
                      disabled={user?.email === u.email} // Cannot disable self
                    >
                      <i className={`bi ${u.active ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthLayout>
  );
}
