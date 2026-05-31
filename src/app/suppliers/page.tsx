'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';

export default function SuppliersPage() {
  const { token, api } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        alert('Supplier profile updated successfully');
      } else {
        await api.post('/suppliers', payload);
        alert('Supplier profile created successfully');
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
      alert(err.response?.data?.message || 'Error processing supplier profile');
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
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      alert('Supplier deleted successfully');
      loadSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot delete supplier with transaction history');
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
          <h4 className="font-weight-bold m-0 text-dark">Suppliers</h4>
          <button className="btn btn-primary font-weight-bold d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }} onClick={handleAddClick}>
            <i className="bi bi-plus-circle"></i> Add Supplier
          </button>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                <th className="font-weight-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '10%' }}>ID</th>
                <th className="font-weight-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '25%' }}>Name</th>
                <th className="font-weight-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>Email</th>
                <th className="font-weight-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '15%' }}>Phone</th>
                <th className="font-weight-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>Address</th>
                <th className="font-weight-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">No suppliers found. Click "Add Supplier" to create one.</td>
                </tr>
              ) : (
                suppliers.map((supp) => (
                  <tr key={supp.id}>
                    <td className="ps-3 border-bottom py-3 text-secondary">{supp.id}</td>
                    <td className="border-bottom font-weight-semibold text-dark">{supp.name}</td>
                    <td className="border-bottom text-secondary">{supp.email || <span className="text-muted fs-8">None</span>}</td>
                    <td className="border-bottom text-secondary">{supp.phone || <span className="text-muted fs-8">None</span>}</td>
                    <td className="border-bottom text-secondary">{supp.address || <span className="text-muted fs-8">None</span>}</td>
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
      </div>

      {/* Supplier Form Modal */}
      <div className="modal fade text-dark" id="supplierModal" tabIndex={-1} aria-labelledby="supplierModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
          <div className="modal-content border-0 shadow-lg rounded-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h5 className="modal-title font-weight-bold text-dark m-0" id="supplierModalLabel" style={{ fontSize: '1.1rem' }}>
                {isEditing ? 'Edit Supplier' : 'New Supplier'}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" style={{ fontSize: '0.8rem' }}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4" style={{ backgroundColor: 'var(--light-card)' }}>
                <div className="mb-3">
                  <label className="form-label font-weight-bold text-secondary fs-8 mb-1">Name</label>
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
                  <label className="form-label font-weight-bold text-secondary fs-8 mb-1">Email</label>
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
                  <label className="form-label font-weight-bold text-secondary fs-8 mb-1">Phone</label>
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
                  <label className="form-label font-weight-bold text-secondary fs-8 mb-1">Address</label>
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
                <button type="submit" className="btn btn-primary px-4 py-2 font-weight-semibold" style={{ backgroundColor: '#0066ff', border: 'none', borderRadius: '20px', fontSize: '0.9rem' }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
