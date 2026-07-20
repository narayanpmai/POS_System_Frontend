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
      <div className="container-fluid px-4 py-4">
        <h2 className="mb-4">{t('fiscal_years', 'title') || 'आर्थिक वर्ष (Fiscal Years)'}</h2>

        <div className="row g-4">
          {/* List Section */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="mb-0">{t('fiscal_years', 'title') || 'Fiscal Years List'}</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">{t('fiscal_years', 'fy_name') || 'Name'}</th>
                        <th>{t('common', 'start_date') || 'Start Date (AD)'}</th>
                        <th>{t('common', 'end_date') || 'End Date (AD)'}</th>
                        <th>{t('common', 'status') || 'Status'}</th>
                        <th className="pe-4 text-end">{t('common', 'actions') || 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                      ) : fiscalYears.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-4 text-muted">No fiscal years found</td></tr>
                      ) : (
                        fiscalYears.map((fy) => (
                          <tr key={fy.id} className={fy.isActive ? 'table-primary bg-opacity-10' : ''}>
                            <td className="ps-4 fw-medium">{fy.name}</td>
                            <td>{fy.startDate.split('T')[0]}<br/><small className="text-muted">{formatAdToBsFull(fy.startDate)}</small></td>
                            <td>{fy.endDate.split('T')[0]}<br/><small className="text-muted">{formatAdToBsFull(fy.endDate)}</small></td>
                            <td>
                              {fy.isActive ? (
                                <span className="badge bg-success">{t('common', 'active') || 'ACTIVE'}</span>
                              ) : (
                                <span className="badge bg-secondary">{t('common', 'inactive') || 'INACTIVE'}</span>
                              )}
                            </td>
                            <td className="pe-4 text-end">
                              <div className="d-flex gap-2 justify-content-end">
                                {!fy.isActive && (
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleSetActive(fy.id)}
                                    title="Make Active"
                                  >
                                    <i className="bi bi-check-circle"></i>
                                  </button>
                                )}
                                <button 
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleEdit(fy)}
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                {!fy.isActive && (
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(fy.id)}
                                    title="Delete"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
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

          {/* Add New Section */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="mb-0">{editingId ? t('fiscal_years', 'edit_fy') : t('fiscal_years', 'add_fy')}</h5>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">{t('fiscal_years', 'fy_name') || 'Fiscal Year Name'} <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 2080/081" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">{t('common', 'start_date') || 'Start Date (BS)'} <span className="text-danger">*</span></label>
                    <BSDatePicker 
                      value={startDate}
                      onChange={(date) => setStartDate(date)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label">{t('common', 'end_date') || 'End Date (BS)'} <span className="text-danger">*</span></label>
                    <BSDatePicker 
                      value={endDate}
                      onChange={(date) => setEndDate(date)}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary flex-grow-1 py-2" disabled={isSubmitting}>
                      {isSubmitting ? t('common', 'saving') : (editingId ? t('common', 'update') : t('common', 'save'))}
                    </button>
                    {editingId && (
                      <button type="button" className="btn btn-light py-2" onClick={resetForm} disabled={isSubmitting}>
                        {t('common', 'cancel')}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
