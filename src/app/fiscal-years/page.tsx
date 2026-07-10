'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth, FiscalYear } from '@/context/AuthContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import BSDatePicker from '@/components/BSDatePicker';

export default function FiscalYearsPage() {
  const { api, refreshFiscalYear, loading: authLoading, isAuthenticated } = useAuth();
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
        alert('Fiscal Year updated successfully');
      } else {
        await api.post('/fiscal-years', {
          name,
          startDate,
          endDate,
          isActive: false
        });
        alert('Fiscal Year created successfully');
      }
      resetForm();
      fetchFiscalYears();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} fiscal year`);
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
    if (!window.confirm('Are you sure you want to delete this Fiscal Year?')) return;
    try {
      await api.delete(`/fiscal-years/${id}`);
      alert('Fiscal Year deleted successfully');
      fetchFiscalYears();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete fiscal year');
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
        <h2 className="mb-4">आर्थिक वर्ष (Fiscal Years)</h2>

        <div className="row g-4">
          {/* List Section */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="mb-0">Fiscal Years List</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Name</th>
                        <th>Start Date (AD)</th>
                        <th>End Date (AD)</th>
                        <th>Status</th>
                        <th className="pe-4 text-end">Action</th>
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
                                <span className="badge bg-success">ACTIVE</span>
                              ) : (
                                <span className="badge bg-secondary">INACTIVE</span>
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
                <h5 className="mb-0">{editingId ? 'Edit Fiscal Year' : 'Add New Fiscal Year'}</h5>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Fiscal Year Name <span className="text-danger">*</span></label>
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
                    <label className="form-label">Start Date (BS) <span className="text-danger">*</span></label>
                    <BSDatePicker 
                      value={startDate}
                      onChange={(date) => setStartDate(date)}
                    />
                    <small className="text-muted d-block mt-1">Select the start date in Nepali Calendar</small>
                  </div>
                  <div className="mb-4">
                    <label className="form-label">End Date (BS) <span className="text-danger">*</span></label>
                    <BSDatePicker 
                      value={endDate}
                      onChange={(date) => setEndDate(date)}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary flex-grow-1 py-2" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                    </button>
                    {editingId && (
                      <button type="button" className="btn btn-light py-2" onClick={resetForm} disabled={isSubmitting}>
                        Cancel
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
