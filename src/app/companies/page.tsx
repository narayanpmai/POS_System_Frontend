'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

import AuthLayout from '@/components/AuthLayout';
import { formatAdToBs } from '@/utils/nepaliDate';

interface Company {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CompaniesPage() {
  const { api, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '',
    adminName: '', adminEmail: '', adminPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '', email: '', phone: '', address: '', isActive: true
  });

  const [showInactive, setShowInactive] = useState(false);
  const isSuperAdmin = user?.role?.name === 'Super Admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies(showInactive);
    }
  }, [isSuperAdmin, showInactive]);

  const fetchCompanies = async (includeInactive = showInactive) => {
    try {
      const res = await api.get(`/companies?includeInactive=${includeInactive}`);
      setCompanies(res.data);
    } catch (err) {
      console.error('Error fetching companies', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ name: '', email: '', phone: '', address: '', adminName: '', adminEmail: '', adminPassword: '' });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleOpenEditModal = (company: Company) => {
    setEditingCompany(company);
    setEditFormData({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      isActive: company.isActive
    });
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post('/companies', formData);
      fetchCompanies();
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.put(`/companies/${editingCompany.id}`, editFormData);
      fetchCompanies();
      setShowEditModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to update company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id: number, name: string) => {
    const reason = window.confirm(`Are you sure you want to deactivate "${name}"?\nThis will prevent all users of this company from logging in, but their data will remain safe in the system.`);
    if (!reason) {
      alert('Action cancelled.');
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/companies/${id}`);
      alert('Company deactivated successfully.');
      fetchCompanies();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to deactivate company');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermanently = async (id: number, name: string) => {
    const reason = window.confirm(`⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY delete "${name}" and all its users/data from the database?\nThis action CANNOT be undone!`);
    if (!reason) return;
    try {
      setLoading(true);
      await api.delete(`/companies/${id}?permanent=true`);
      alert('Company permanently deleted.');
      fetchCompanies(showInactive);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to permanently delete company');
    } finally {
      setLoading(false);
    }
  };


  if (!isSuperAdmin) {
    return <AuthLayout><div className="p-4">Access Denied. Only Super Admin can view this page.</div></AuthLayout>;
  }

  return (
    <AuthLayout>
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <h2 className="mb-0">🏢 {t('common', 'Companies') || 'Companies (Super Admin)'}</h2>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="form-check form-switch mb-0">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="showInactiveToggle" 
                checked={showInactive} 
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  fetchCompanies(e.target.checked);
                }} 
              />
              <label className="form-check-label text-muted" htmlFor="showInactiveToggle">
                Show Inactive / Demo
              </label>
            </div>
            <button className="btn btn-secondary" onClick={() => router.back()}>
              <i className="bi bi-arrow-left me-2"></i> Back
            </button>
            <button className="btn btn-primary" onClick={handleOpenModal}>
              <i className="bi bi-plus-circle me-2"></i> Add Company
            </button>
          </div>
        </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>S.N.</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td className="fw-bold">{c.name}</td>
                      <td>{c.email || 'N/A'}</td>
                      <td>
                        {c.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </td>
                      <td>{formatAdToBs(c.createdAt)}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenEditModal(c)} title="Edit">
                          <i className="bi bi-pencil"></i>
                        </button>
                        {c.id !== 1 && (
                          c.isActive ? (
                            <button className="btn btn-sm btn-outline-warning" onClick={() => handleDeleteCompany(c.id, c.name)} title="Deactivate Company">
                              <i className="bi bi-power"></i>
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePermanently(c.id, c.name)} title="Permanently Delete Company">
                              <i className="bi bi-trash"></i>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No companies found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Add New Tenant / Company</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                {errorMsg && <div className="alert alert-danger p-2 mb-3">{errorMsg}</div>}

                <form onSubmit={handleSubmit} id="add-company-form">
                  <h6 className="mb-3 text-primary border-bottom pb-2">Company Details</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Company Name *</label>
                      <input type="text" className="form-control bg-light" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control bg-light" name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Company Email</label>
                      <input type="email" className="form-control bg-light" name="email" value={formData.email} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Address</label>
                      <input type="text" className="form-control bg-light" name="address" value={formData.address} onChange={handleChange} />
                    </div>
                  </div>

                  <h6 className="mb-3 text-primary border-bottom pb-2">Admin User Details (Required)</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Admin Name</label>
                      <input type="text" className="form-control bg-light" name="adminName" value={formData.adminName} onChange={handleChange} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Admin Email (Login) *</label>
                      <input type="email" className="form-control bg-light" name="adminEmail" value={formData.adminEmail} onChange={handleChange} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Admin Password *</label>
                      <input type="password" className="form-control bg-light" name="adminPassword" value={formData.adminPassword} onChange={handleChange} required minLength={6} />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-light" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" form="add-company-form" className="btn btn-primary px-4" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Company & Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditModal && editingCompany && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Edit Company</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                {errorMsg && <div className="alert alert-danger p-2 mb-3">{errorMsg}</div>}

                <form onSubmit={handleEditSubmit} id="edit-company-form">
                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label">Company Name *</label>
                      <input type="text" className="form-control bg-light" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control bg-light" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Company Email</label>
                      <input type="email" className="form-control bg-light" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Address</label>
                      <input type="text" className="form-control bg-light" value={editFormData.address} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} />
                    </div>
                    <div className="col-md-12">
                      <div className="form-check form-switch mt-2">
                        <input className="form-check-input" type="checkbox" role="switch" checked={editFormData.isActive} onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })} />
                        <label className="form-check-label fw-medium ms-2">Active Status</label>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-light" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" form="edit-company-form" className="btn btn-primary px-4" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthLayout>
  );
}
