'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';

export default function BrandsPage() {
  const { token, api } = useAuth();
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
        alert('Brand updated successfully');
      } else {
        await api.post('/brands', { name, status });
        alert('Brand created successfully');
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
      alert(err.response?.data?.message || 'Error processing brand');
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
    if (!confirm('Are you sure you want to delete this brand?')) return;
    try {
      await api.delete(`/brands/${id}`);
      alert('Brand deleted successfully');
      loadBrands();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot delete brand with associated products');
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
          <h4 className="fw-bold m-0 text-dark">Brands</h4>
          <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }} onClick={handleAddClick}>
            <i className="bi bi-plus-circle"></i> Add Brand
          </button>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '10%' }}>ID</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '35%' }}>Name</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '30%' }}>Slug</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '15%' }}>Status</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">Loading brands...</td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">No brands found. Click "Add Brand" to create one.</td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id}>
                    <td className="ps-3 border-bottom py-3 text-secondary">{brand.id}</td>
                    <td className="border-bottom fw-semibold text-dark">{brand.name}</td>
                    <td className="border-bottom text-secondary font-mono">{brand.slug}</td>
                    <td className="border-bottom">
                      <span className={`badge px-2 py-1 ${brand.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`} style={{ borderRadius: '4px', fontSize: '11px' }}>
                        {brand.status === 'ACTIVE' ? 'Active' : 'Inactive'}
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
                {isEditing ? 'Edit Brand' : 'Add Brand'}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Brand Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Apple, Samsung, Local Product"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Status</label>
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer border-top p-3">
                <button type="button" className="btn btn-light rounded-md" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary rounded-md">{isEditing ? 'Save Changes' : 'Save Brand'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
