'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

export default function BrandsPage() {
  const { token, api } = useAuth();
  const { t } = useLanguage();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  useEffect(() => {
    if (!token) return;
    loadBrands();
  }, [token]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const res = await api.get('/brands');
      setBrands(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (isEditing && editingBrandId) {
        await api.put(`/brands/${editingBrandId}`, { name, status });
        alert(t('brands', 'success_update'));
      } else {
        await api.post('/brands', { name, status });
        alert(t('brands', 'success_add'));
      }
      setName('');
      setStatus('ACTIVE');
      setIsEditing(false);
      setEditingBrandId(null);

      // Close Bootstrap modal
      const modalElement = document.getElementById('brandModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadBrands();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const handleEdit = (brand: any) => {
    setName(brand.name);
    setStatus(brand.status);
    setEditingBrandId(brand.id);
    setIsEditing(true);

    const modalElement = document.getElementById('brandModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('brands', 'confirm_delete'))) return;
    try {
      await api.delete(`/brands/${id}`);
      alert(t('brands', 'success_delete'));
      loadBrands();
    } catch (err: any) {
      alert(err.response?.data?.message || t('brands', 'error_delete'));
    }
  };

  const handleAddClick = () => {
    setName('');
    setStatus('ACTIVE');
    setIsEditing(false);
    setEditingBrandId(null);

    const modalElement = document.getElementById('brandModal');
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
          <h4 className="fw-bold m-0 text-dark">{t('brands', 'title')}</h4>
          <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }} onClick={handleAddClick}>
            <i className="bi bi-plus-circle"></i> {t('brands', 'add_brand')}
          </button>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '10%' }}>{t('common', 'id') || 'ID'}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '35%' }}>{t('common', 'name')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '30%' }}>{t('brands', 'slug')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '15%' }}>{t('common', 'status')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">{t('brands', 'loading_brands')}</td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">{t('brands', 'no_brands')}</td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id}>
                    <td className="ps-3 border-bottom py-3 text-secondary">{brand.id}</td>
                    <td className="border-bottom fw-semibold text-dark">{brand.name}</td>
                    <td className="border-bottom text-secondary font-mono">{brand.slug}</td>
                    <td className="border-bottom">
                      <span className={`badge px-2 py-1 ${brand.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`} style={{ borderRadius: '4px', fontSize: '11px' }}>
                        {brand.status === 'ACTIVE' ? t('common', 'active') : t('common', 'inactive')}
                      </span>
                    </td>
                    <td className="border-bottom text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEdit(brand)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDelete(brand.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
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
      </div>

      {/* Brand Form Modal */}
      <div className="modal fade text-dark" id="brandModal" tabIndex={-1} aria-labelledby="brandModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-lg">
            <div className="modal-header bg-primary text-white border-none p-3.5">
              <h5 className="modal-title fw-bold" id="brandModalLabel">
                {isEditing ? t('brands', 'edit_brand') : t('brands', 'add_brand')}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">{t('brands', 'brand_name')}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('brands', 'brand_placeholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">{t('common', 'status')}</label>
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ACTIVE">{t('common', 'active')}</option>
                    <option value="INACTIVE">{t('common', 'inactive')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer border-top p-3">
                <button type="button" className="btn btn-light rounded-md" data-bs-dismiss="modal">{t('common', 'cancel')}</button>
                <button type="submit" className="btn btn-primary rounded-md">{isEditing ? t('brands', 'save_changes') : t('brands', 'save_brand')}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
