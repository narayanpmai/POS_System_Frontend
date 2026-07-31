'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useModal } from '@/context/ModalContext';
import { useRouter } from 'next/navigation';

import AuthLayout from '@/components/AuthLayout';
import { formatAdToBs } from '@/utils/nepaliDate';
import TableControls from '@/components/TableControls';

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  active: boolean;
  role?: { name: string };
}

interface Company {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  users?: CompanyUser[];
}

export default function CompaniesPage() {
  const { api, user } = useAuth();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();
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

  // Assign Admin Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetCompany, setTargetCompany] = useState<Company | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [assignFormData, setAssignFormData] = useState({
    userId: '',
    name: '',
    email: '',
    password: '',
  });

  const [showInactive, setShowInactive] = useState(false);
  const isSuperAdmin = user?.role?.name === 'Super Admin';

  const [totalCompanies, setTotalCompanies] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies(showInactive);
    }
  }, [isSuperAdmin, showInactive, currentPage, rowsPerPage]);

  const fetchCompanies = async (includeInactive = showInactive) => {
    try {
      const res = await api.get(`/companies?page=${currentPage}&limit=${rowsPerPage}&includeInactive=${includeInactive}`);
      setCompanies(res.data?.items || res.data || []);
      setTotalCompanies(res.data?.total || (Array.isArray(res.data) ? res.data.length : 0));
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

  const handleOpenAssignModal = async (company: Company) => {
    setTargetCompany(company);
    setAssignFormData({ userId: '', name: '', email: '', password: '' });
    setAssignMode('existing');
    setErrorMsg('');
    setShowAssignModal(true);
    try {
      const res = await api.get('/users');
      setAllUsers(res.data);
    } catch (err) {
      console.error('Failed to load users list', err);
    }
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

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompany) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = assignMode === 'existing'
        ? { userId: parseInt(assignFormData.userId, 10) }
        : { name: assignFormData.name, email: assignFormData.email, password: assignFormData.password };

      const res = await api.post(`/companies/${targetCompany.id}/assign-admin`, payload);
      showAlert(res.data.message || 'Admin assigned successfully', { type: 'success', title: 'Admin Assigned' });
      setShowAssignModal(false);
      fetchCompanies(showInactive);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to assign admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = (id: number, name: string) => {
    showConfirm({
      title: 'Deactivate Company',
      message: `Are you sure you want to deactivate "${name}"?\nThis will prevent all users of this company from logging in, but their data will remain safe in the system.`,
      type: 'warning',
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete(`/companies/${id}`);
          showAlert('Company deactivated successfully.', { type: 'success', title: 'Company Deactivated' });
          fetchCompanies();
        } catch (err: any) {
          console.error(err);
          showAlert(err.response?.data?.message || 'Failed to deactivate company', { type: 'danger', title: 'Deactivation Failed' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleFlushData = (id: number, name: string) => {
    const isProtected = id === 10 || id === 12;
    showConfirm({
      title: isProtected ? '⚠️ Flush Core Company Data Warning' : 'Flush Company Data',
      message: isProtected 
        ? `Company #${id} ("${name}") is a CORE company.\n\nFlushing data will wipe ALL sales, purchases, stock, products, expenses, customers, and suppliers for "${name}".\n\nAre you sure you want to flush its operational data?`
        : `Are you sure you want to flush all operational data for "${name}"?\nThis will clear products, sales, stock, and transactions, leaving the company and user accounts intact.`,
      type: isProtected ? 'danger' : 'warning',
      confirmText: 'Yes, Flush Data',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.post(`/companies/${id}/flush-data`);
          showAlert(`Operational data for "${name}" flushed successfully.`, { type: 'success', title: 'Data Flushed' });
          fetchCompanies(showInactive);
        } catch (err: any) {
          console.error(err);
          showAlert(err.response?.data?.message || 'Failed to flush company data', { type: 'danger', title: 'Flush Failed' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeletePermanently = (id: number, name: string) => {
    const isProtected = id === 10 || id === 12;
    showConfirm({
      title: isProtected ? '⚠️ PERMANENT DELETE CORE COMPANY WARNING' : 'Permanent Delete Warning',
      message: isProtected
        ? `PERMANENT DELETE WARNING FOR CORE COMPANY #${id} ("${name}"):\n\nAre you absolutely sure you want to PERMANENTLY delete "${name}" and all its users/data from the database?\n\nThis action CANNOT be undone!`
        : `Are you sure you want to PERMANENTLY delete "${name}" and all its users/data from the database?\n\nThis action CANNOT be undone!`,
      type: 'danger',
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete(`/companies/${id}?permanent=true`);
          showAlert(`Company "${name}" permanently deleted.`, { type: 'success', title: 'Company Deleted' });
          fetchCompanies(showInactive);
        } catch (err: any) {
          console.error(err);
          showAlert(err.response?.data?.message || 'Failed to permanently delete company', { type: 'danger', title: 'Delete Failed' });
        } finally {
          setLoading(false);
        }
      },
    });
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
                    <th>Company Email</th>
                    <th>Assigned Admin / Users</th>
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
                        {c.users && c.users.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {c.users.map(u => (
                              <span key={u.id} className="badge bg-primary-subtle text-primary border border-primary-subtle" title={`${u.name} (${u.email})`}>
                                👤 {u.email}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small">No Admin assigned</span>
                        )}
                      </td>
                      <td>
                        {c.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </td>
                      <td>{formatAdToBs(c.createdAt)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleOpenEditModal(c)} title="Edit Company">
                            <i className="bi bi-pencil"></i>
                          </button>
                          
                          <button className="btn btn-sm btn-outline-info" onClick={() => handleOpenAssignModal(c)} title="Assign Admin / User to Company">
                            <i className="bi bi-person-plus-fill"></i>
                          </button>

                          {c.id !== 1 && (
                            <>
                              <button 
                                className="btn btn-sm btn-outline-secondary" 
                                onClick={() => handleFlushData(c.id, c.name)} 
                                title="Flush Operational Data (Products, Sales, Stock)"
                              >
                                <i className="bi bi-eraser-fill"></i>
                              </button>

                              {c.isActive ? (
                                <button className="btn btn-sm btn-outline-warning" onClick={() => handleDeleteCompany(c.id, c.name)} title="Deactivate Company">
                                  <i className="bi bi-power"></i>
                                </button>
                              ) : null}

                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePermanently(c.id, c.name)} title="Permanently Delete Company">
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        No companies found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TableControls
              total={totalCompanies}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Assign Admin Modal */}
      {showAssignModal && targetCompany && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">👤 Assign Admin for "{targetCompany.name}"</h5>
                <button type="button" className="btn-close" onClick={() => setShowAssignModal(false)}></button>
              </div>
              <div className="modal-body">
                {errorMsg && <div className="alert alert-danger p-2 mb-3">{errorMsg}</div>}

                <div className="btn-group w-100 mb-3" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${assignMode === 'existing' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setAssignMode('existing')}
                  >
                    Link Existing System User
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${assignMode === 'new' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setAssignMode('new')}
                  >
                    Create New Admin Account
                  </button>
                </div>

                <form onSubmit={handleAssignSubmit} id="assign-admin-form">
                  {assignMode === 'existing' ? (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Select Existing User to Assign</label>
                      <select
                        className="form-select bg-light"
                        value={assignFormData.userId}
                        onChange={(e) => setAssignFormData({ ...assignFormData, userId: e.target.value })}
                        required
                      >
                        <option value="">-- Choose User --</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) - Current Co #{u.companyId}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-12">
                        <label className="form-label fw-semibold">Admin Name *</label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={assignFormData.name}
                          onChange={(e) => setAssignFormData({ ...assignFormData, name: e.target.value })}
                          required
                          placeholder="e.g. Sonam Sherpa"
                        />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label fw-semibold">Admin Email (Login) *</label>
                        <input
                          type="email"
                          className="form-control bg-light"
                          value={assignFormData.email}
                          onChange={(e) => setAssignFormData({ ...assignFormData, email: e.target.value })}
                          required
                          placeholder="admin@company.com"
                        />
                      </div>
                      <div className="col-md-12">
                        <label className="form-label fw-semibold">Password *</label>
                        <input
                          type="password"
                          className="form-control bg-light"
                          value={assignFormData.password}
                          onChange={(e) => setAssignFormData({ ...assignFormData, password: e.target.value })}
                          required
                          minLength={6}
                          placeholder="Minimum 6 characters"
                        />
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-light" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" form="assign-admin-form" className="btn btn-primary px-4" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Assign Admin'}
                </button>
              </div>
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
