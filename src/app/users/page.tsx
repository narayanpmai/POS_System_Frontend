'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { formatAdToBs } from '@/utils/nepaliDate';

export default function UserControlPage() {
  const { token, api, user } = useAuth();
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
    roleId: 2, // Default to cashier
    active: true,
  });

  // Password reset state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!token) return;
    if (user && user.role.name !== 'Admin') {
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
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddClick = () => {
    setFormData({ name: '', email: '', password: '', roleId: roles.find(r => r.name === 'Cashier')?.id || 2, active: true });
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
        alert('User updated successfully');
      } else {
        if (!formData.password) return alert('Password is required for new users');
        await api.post('/users', formData);
        alert('User created successfully');
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving user');
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
      alert('Password reset successfully');
      setShowResetModal(false);
      setNewPassword('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error resetting password');
    }
  };

  return (
    <AuthLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold m-0">User Management & Access Control</h4>
        <button className="btn btn-primary fw-bold px-4" onClick={handleAddClick}>
          + Create New Staff
        </button>
      </div>

      {showForm && (
        <div className="card p-4 border-none shadow-sm mb-4" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
          <h5 className="fw-bold mb-4">{isEditing ? 'Edit User Details' : 'Create New Staff Member'}</h5>
          <form onSubmit={submitForm}>
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Full Name</label>
                <input required type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Email (Login ID)</label>
                <input required type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              
              {!isEditing && (
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Initial Password</label>
                  <input required type="password" minLength={6} className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              )}

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">Role Access</label>
                <select className="form-select" value={formData.roleId} onChange={e => setFormData({...formData, roleId: parseInt(e.target.value)})}>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-light border px-4" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary px-4 fw-bold">
                {isEditing ? 'Save Changes' : 'Create User'}
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
              <label className="form-label fw-semibold">New Password</label>
              <input required type="password" minLength={6} className="form-control w-50" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light border" onClick={() => setShowResetModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-danger fw-bold">Confirm Reset</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-4 border-none shadow-sm" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
        <h5 className="fw-bold mb-3">System Users</h5>
        <div className="table-responsive">
          <table className="table custom-table align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="text-end">Actions</th>
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
                      <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1 rounded-pill"><i className="bi bi-check-circle-fill me-1"></i>Active</span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill"><i className="bi bi-slash-circle-fill me-1"></i>Disabled</span>
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
