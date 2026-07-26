'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth, FiscalYear } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import BSDatePicker from '@/components/BSDatePicker';

export default function FiscalYearsPage() {
  const { api, refreshFiscalYear, loading: authLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchFiscalYears();
    }
  }, [authLoading, isAuthenticated]);

  const fetchFiscalYears = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fiscal-years');
      setFiscalYears(res.data);
    } catch (err: any) {
      alert('Failed to load fiscal years');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    try {
      setIsSubmitting(true);
      if (editingId) {
        await api.put(`/fiscal-years/${editingId}`, {
          name,
          startDate,
          endDate
        });
        alert(t('common', 'updated_successfully') || 'Fiscal Year updated successfully');
      } else {
        await api.post('/fiscal-years', {
          name,
          startDate,
          endDate,
          isActive: false
        });
        alert(t('common', 'saved_successfully') || 'Fiscal Year created successfully');
      }
      resetForm();
      fetchFiscalYears();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setStartDate('');
    setEndDate('');
  };

  const handleEdit = (fy: FiscalYear) => {
    setEditingId(fy.id);
    setName(fy.name);
    setStartDate(fy.startDate.split('T')[0]);
    setEndDate(fy.endDate.split('T')[0]);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('common', 'confirm_delete') || 'Are you sure you want to delete this Fiscal Year?')) return;
    try {
      await api.delete(`/fiscal-years/${id}`);
      alert(t('common', 'deleted_successfully') || 'Fiscal Year deleted successfully');
      fetchFiscalYears();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      await api.put(`/fiscal-years/${id}/set-active`);
      alert('Active Fiscal Year updated!');
      await fetchFiscalYears();
      await refreshFiscalYear(); // Update global context immediately
    } catch (err: any) {
      alert('Failed to set active fiscal year');
    }
  };

  return (
    <AuthLayout>
      <div className="container-fluid px-4 py-4 animate-fade-in-up">
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold m-0 text-dark" style={{ fontFamily: 'var(--font-heading)' }}>
              <i className="bi bi-calendar-range me-2 text-primary"></i>
              {t('fiscal_years', 'title') || 'Fiscal Year Settings'}
            </h3>
            <p className="text-secondary mt-1 mb-0">Manage and set active fiscal years for the platform.</p>
          </div>
        </div>

        <div className="row g-4">
          {/* Add New Section (Left) */}
          <div className="col-lg-4 animate-slide-in-right animate-delay-100">
            <div className="stat-card h-100 stat-card-blue border-0 shadow-lg" style={{ overflow: 'visible' }}>
              <div className="d-flex align-items-center mb-3">
                <div className="stat-card-icon mb-0 me-3 shadow-sm">
                  <i className={`bi ${editingId ? 'bi-pencil-square' : 'bi-plus-lg'}`}></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                    {editingId ? 'Edit Fiscal Year' : 'Add Fiscal Year'}
                  </h5>
                  <p className="text-secondary small mb-0">Create a new fiscal year period.</p>
                </div>
              </div>
              
              <hr className="border-secondary opacity-10 my-4" />

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Name (e.g. २०८१/०८२)</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg shadow-sm border-0 bg-light" 
                    placeholder="e.g. २०८१/०८२" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required 
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>Start Date</label>
                  <div className="shadow-sm rounded bg-light p-1">
                    <BSDatePicker 
                      value={startDate}
                      onChange={(date) => setStartDate(date)}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>End Date</label>
                  <div className="shadow-sm rounded bg-light p-1">
                    <BSDatePicker 
                      value={endDate}
                      onChange={(date) => setEndDate(date)}
                    />
                  </div>
                </div>
                <div className="d-flex gap-3 mt-5">
                  <button type="submit" className="btn btn-primary flex-grow-1 py-2 text-white fw-bold d-flex align-items-center justify-content-center shadow" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...</>
                    ) : (
                      <><i className={`bi ${editingId ? 'bi-check2-circle' : 'bi-plus-circle'} me-2`}></i> {editingId ? 'Update' : 'Save'} Fiscal Year</>
                    )}
                  </button>
                  {editingId && (
                    <button type="button" className="btn btn-light shadow-sm py-2 fw-bold text-secondary border hover-opacity" onClick={resetForm} disabled={isSubmitting}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Section (Right) */}
          <div className="col-lg-8 animate-slide-in-right animate-delay-200">
            <div className="card border-0 shadow-lg h-100" style={{ background: 'var(--light-card)', borderRadius: 'var(--radius-lg)' }}>
              <div className="card-body p-4 p-xl-5">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h5 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'var(--font-heading)' }}>Fiscal Years List</h5>
                    <p className="text-secondary small mb-0">Only one fiscal year can be active at a time.</p>
                  </div>
                  <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold border border-primary border-opacity-25 shadow-sm">
                    <i className="bi bi-info-circle-fill me-1"></i> {fiscalYears.length} Records
                  </div>
                </div>
                
                <div className="table-responsive">
                  <table className="table custom-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="rounded-start">Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th className="text-end rounded-end">Action</th>
                      </tr>
                    </thead>
                    <tbody className="border-top-0">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2 text-secondary small fw-medium">Fetching fiscal years...</p>
                          </td>
                        </tr>
                      ) : fiscalYears.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-5 text-muted">
                            <div className="p-4 bg-light rounded-circle d-inline-block mb-3 shadow-sm border">
                              <i className="bi bi-calendar-x fs-1 text-secondary opacity-50"></i>
                            </div>
                            <h6 className="fw-bold text-dark">{t('fiscal_years', 'no_fiscal_years') || 'No fiscal years found'}</h6>
                            <p className="small mb-0">Create your first fiscal year using the form.</p>
                          </td>
                        </tr>
                      ) : (
                        fiscalYears.map((fy) => (
                          <tr key={fy.id} className="hover-highlight" style={{ transition: 'background-color 0.2s', borderBottom: '1px solid var(--border-color)' }}>
                            <td className="fw-bold text-dark py-3">
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 text-primary rounded px-2 py-1 me-3 fw-bold small shadow-sm border border-primary border-opacity-10">
                                  FY
                                </div>
                                {fy.name}
                              </div>
                            </td>
                            <td className="py-3 text-secondary fw-medium"><i className="bi bi-calendar3 me-2 opacity-50"></i>{fy.startDate.split('T')[0]}</td>
                            <td className="py-3 text-secondary fw-medium"><i className="bi bi-calendar3-fill me-2 opacity-50"></i>{fy.endDate.split('T')[0]}</td>
                            <td className="py-3">
                              {fy.isActive ? (
                                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2 fw-bold shadow-sm d-inline-flex align-items-center">
                                  <span className="p-1 bg-success rounded-circle me-2" style={{ width: '6px', height: '6px' }}></span> Active
                                </span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-3 py-2 fw-medium d-inline-flex align-items-center">
                                  <span className="p-1 bg-secondary rounded-circle me-2 opacity-50" style={{ width: '6px', height: '6px' }}></span> Inactive
                                </span>
                              )}
                            </td>
                            <td className="text-end py-3">
                              <div className="d-flex justify-content-end gap-2">
                                <button 
                                  className="btn btn-sm btn-light border shadow-sm rounded-circle hover-lift"
                                  onClick={() => handleEdit(fy)}
                                  title="Edit"
                                  style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                >
                                  <i className="bi bi-pencil-fill text-primary"></i>
                                </button>
                                {!fy.isActive && (
                                  <>
                                    <button 
                                      className="btn btn-sm btn-light border shadow-sm rounded-circle hover-lift"
                                      onClick={() => handleSetActive(fy.id)}
                                      title="Set Active"
                                      style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                    >
                                      <i className="bi bi-check-circle-fill text-success"></i>
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-light border shadow-sm rounded-circle hover-lift"
                                      onClick={() => handleDelete(fy.id)}
                                      title="Delete"
                                      style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                    >
                                      <i className="bi bi-trash-fill text-danger"></i>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .hover-highlight:hover {
          background-color: rgba(13, 110, 253, 0.03) !important;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          background-color: #ffffff !important;
        }
      `}</style>
    </AuthLayout>
  );
}
