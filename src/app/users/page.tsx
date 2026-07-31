'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useModal } from '@/context/ModalContext';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { formatAdToBs } from '@/utils/nepaliDate';
import TableControls, { applyPagination } from '@/components/TableControls';

export default function UserControlPage() {
  const router = useRouter();
  const { token, api, user } = useAuth();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();
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

  // View Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: 3, // Cashier default
    companyId: '',
    active: true
  });

  // Reset password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, currentPage, rowsPerPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        api.get(`/users?page=${currentPage}&limit=${rowsPerPage}`),
        api.get('/users/roles')
      ]);
      setUsers(uRes.data?.items || uRes.data || []);
      setTotalUsers(uRes.data?.total || (Array.isArray(uRes.data) ? uRes.data.length : 0));
      setRoles(rRes.data);

      if (user?.role?.name === 'Super Admin') {
        const cRes = await api.get('/companies');
        setCompanies(cRes.data?.items || cRes.data || []);
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to load user data', { type: 'danger', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      roleId: roles.find(r => r.name === 'Cashier')?.id || roles[0]?.id || 3,
      companyId: user?.companyId ? String(user.companyId) : '',
      active: true
    });
    setShowForm(true);
  };

  const handleEditClick = (u: any) => {
    setFormData({ 
      name: u.name, 
      email: u.email, 
      password: '', 
      roleId: u.roleId, 
      companyId: u.companyId ? String(u.companyId) : '', 
      active: u.active 
    });
    setEditingUserId(u.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleViewClick = (u: any) => {
    setViewingUser(u);
    setShowViewModal(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const payload: any = { ...formData };
        if (payload.companyId) payload.companyId = parseInt(payload.companyId as string, 10);
        else delete payload.companyId;
        
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editingUserId}`, payload);
        showAlert(t('users', 'success_update') || 'User updated successfully', { type: 'success', title: 'User Updated' });
      } else {
        if (!formData.password) return showAlert('Password is required for new users', { type: 'warning', title: 'Validation Warning' });
        const payload: any = { ...formData };
        if (payload.companyId) payload.companyId = parseInt(payload.companyId as string, 10);
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

  const handleDeleteUser = (u: any) => {
    showConfirm({
      title: 'Delete User Account',
      message: `Are you sure you want to PERMANENTLY delete user "${u.name}" (${u.email})?\nThis action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${u.id}`);
          showAlert(`User "${u.name}" deleted successfully.`, { type: 'success', title: 'User Deleted' });
          loadData();
        } catch (err: any) {
          console.error(err);
          showAlert(err.response?.data?.message || 'Failed to delete user', { type: 'danger', title: 'Delete Failed' });
        }
      },
    });
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
                <select className="form-select" value={formData.roleId} onChange={e => setFormData({...formData, roleId: parseInt(e.target.value, 10)})}>
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
                      <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>
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

      {/* Reset Password Modal */}
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

      {/* View User Modal */}
      {showViewModal && viewingUser && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">👤 User Account Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '64px', height: '64px' }}>
                    <i className="bi bi-person-fill fs-2"></i>
                  </div>
                  <h5 className="fw-bold mb-1">{viewingUser.name}</h5>
                  <p className="text-muted mb-0">{viewingUser.email}</p>
                </div>

                <div className="bg-light p-3 rounded-3 mb-3 border">
                  <div className="row g-2">
                    <div className="col-6">
                      <small className="text-muted d-block">User ID</small>
                      <span className="fw-semibold text-dark">#{viewingUser.id}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Role</small>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                        {viewingUser.role?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="col-6 mt-3">
                      <small className="text-muted d-block">Assigned Company</small>
                      <span className="fw-semibold text-dark">
                        {viewingUser.company ? `${viewingUser.company.name} (#${viewingUser.companyId})` : `Company #${viewingUser.companyId}`}
                      </span>
                    </div>
                    <div className="col-6 mt-3">
                      <small className="text-muted d-block">Account Status</small>
                      {viewingUser.active ? (
                        <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1"><i className="bi bi-check-circle-fill me-1"></i>Active</span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25 px-2 py-1"><i className="bi bi-slash-circle-fill me-1"></i>Inactive</span>
                      )}
                    </div>
                    <div className="col-12 mt-3 pt-2 border-top">
                      <small className="text-muted d-block">Account Created Date (BS)</small>
                      <span className="fw-medium text-dark">{formatAdToBs(viewingUser.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setShowViewModal(false)}>Close</button>
              </div>
            </div>
          </div>
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
                <th>Company</th>
                <th>{t('users', 'user_role')}</th>
                <th>{t('common', 'status')}</th>
                <th>{t('common', 'date')}</th>
                <th className="text-end">{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4">Loading users...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="fw-bold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge bg-light text-dark border">
                      🏢 {u.company?.name || `Company #${u.companyId}`}
                    </span>
                  </td>
                  <td>
                    <span className={`badge px-2 py-1 rounded-pill ${u.role?.name === 'Super Admin' ? 'bg-purple-subtle text-purple border' : u.role?.name === 'Admin' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`}>
                      {u.role?.name || 'N/A'}
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
                    <div className="d-flex justify-content-end align-items-center gap-1">
                      <button className="btn btn-sm btn-outline-info" onClick={() => handleViewClick(u)} title="View User Details">
                        <i className="bi bi-eye-fill"></i>
                      </button>

                      <button className="btn btn-sm btn-outline-secondary" onClick={() => {
                        setResetUserId(u.id);
                        setShowResetModal(true);
                      }} title="Reset Password">
                        <i className="bi bi-key-fill"></i>
                      </button>

                      <button className="btn btn-sm btn-outline-primary" onClick={() => handleEditClick(u)} title="Edit User">
                        <i className="bi bi-pencil"></i>
                      </button>

                      <button className={`btn btn-sm ${u.active ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => toggleActiveStatus(u.id, u.active)} title={u.active ? 'Deactivate User' : 'Activate User'}>
                        <i className={`bi ${u.active ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
                      </button>

                      {user?.id !== u.id && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUser(u)} title="Delete User">
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TableControls 
          total={totalUsers} 
          rowsPerPage={rowsPerPage} 
          currentPage={currentPage} 
          onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }} 
          onPageChange={setCurrentPage} 
        />
      </div>
    </AuthLayout>
  );
}
