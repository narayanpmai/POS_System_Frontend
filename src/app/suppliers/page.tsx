'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

import TableControls, { applyPagination } from '@/components/TableControls';
export default function SuppliersPage() {
  const router = useRouter();
  const { token, api } = useAuth();
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!token) return;
    loadSuppliers();
  }, [token]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined
    };

    try {
      if (isEditing && editingSupplierId) {
        await api.put(`/suppliers/${editingSupplierId}`, payload);
        alert(t('suppliers', 'success_update'));
      } else {
        await api.post('/suppliers', payload);
        alert(t('suppliers', 'success_add'));
      }
      
      // Reset
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setIsEditing(false);
      setEditingSupplierId(null);

      // Close Bootstrap modal
      const modalElement = document.getElementById('supplierModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const handleEdit = (supp: any) => {
    setName(supp.name);
    setEmail(supp.email || '');
    setPhone(supp.phone || '');
    setAddress(supp.address || '');
    setEditingSupplierId(supp.id);
    setIsEditing(true);

    const modalElement = document.getElementById('supplierModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('suppliers', 'confirm_delete'))) return;
    try {
      await api.delete(`/suppliers/${id}`);
      alert(t('suppliers', 'success_delete'));
      loadSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.message || t('suppliers', 'error_delete'));
    }
  };

  const handleAddClick = () => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setIsEditing(false);
    setEditingSupplierId(null);

    const modalElement = document.getElementById('supplierModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  return (
    <AuthLayout>
      <div className="card border-0 rounded-md shadow-sm p-4" style={{ backgroundColor: 'var(--light-card)' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <h4 className="fw-bold m-0 text-dark">{t('suppliers', 'title')}</h4>
          </div>
          <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }} onClick={handleAddClick}>
            <i className="bi bi-plus-circle"></i> {t('suppliers', 'add_supplier')}
          </button>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '10%' }}>{t('common', 'id') || 'ID'}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '25%' }}>{t('common', 'name')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('common', 'email')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '15%' }}>{t('common', 'phone')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('common', 'address')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">{t('suppliers', 'loading_suppliers')}</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">{t('suppliers', 'no_suppliers')}</td>
                </tr>
              ) : (
                applyPagination(suppliers, currentPage, rowsPerPage).map((supp) => (
                  <tr key={supp.id}>
                    <td className="ps-3 border-bottom py-3 text-secondary">{supp.id}</td>
                    <td className="border-bottom fw-semibold text-dark">{supp.name}</td>
                    <td className="border-bottom text-secondary">{supp.email || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                    <td className="border-bottom text-secondary">{supp.phone || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                    <td className="border-bottom text-secondary">{supp.address || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                    <td className="border-bottom text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEdit(supp)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDelete(supp.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TableControls
          total={suppliers.length}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Supplier Form Modal */}
      <div className="modal fade text-dark" id="supplierModal" tabIndex={-1} aria-labelledby="supplierModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
          <div className="modal-content border-0 shadow-lg rounded-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h5 className="modal-title fw-bold text-dark m-0" id="supplierModalLabel" style={{ fontSize: '1.1rem' }}>
                {isEditing ? t('suppliers', 'edit_supplier') : t('suppliers', 'new_supplier')}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" style={{ fontSize: '0.8rem' }}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4" style={{ backgroundColor: 'var(--light-card)' }}>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('common', 'name')}</label>
                  <input
                    type="text"
                    className="form-control border-1 p-2"
                    placeholder=""
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('common', 'email')}</label>
                  <input
                    type="email"
                    className="form-control border-1 p-2"
                    placeholder=""
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('common', 'phone')}</label>
                  <input
                    type="text"
                    className="form-control border-1 p-2"
                    placeholder=""
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('common', 'address')}</label>
                  <textarea
                    className="form-control border-1 p-2"
                    rows={3}
                    placeholder=""
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ borderRadius: '6px', resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 p-3 bg-white d-flex justify-content-end">
                <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold" style={{ backgroundColor: '#0066ff', border: 'none', borderRadius: '20px', fontSize: '0.9rem' }}>
                  {t('suppliers', 'save_supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
