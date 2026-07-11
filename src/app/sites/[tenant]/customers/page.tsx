'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import axios from 'axios';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  points: number;
  sales?: any[];
}

export default function CustomersPage() {
  const { token, api } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // CRUD Forms
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '', email: '', phone: '', address: ''
  });

  const [activeHistoryCustomer, setActiveHistoryCustomer] = useState<Customer | null>(null);

  const loadCustomers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/customers?page=${page}&limit=10&search=${search}`);
      setCustomers(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers directory:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [token, page, search]);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: customerForm.name,
      email: customerForm.email || undefined,
      phone: customerForm.phone || undefined,
      address: customerForm.address || undefined
    };

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        alert('Customer profile updated!');
      } else {
        await api.post('/customers', payload);
        alert('Customer profile created!');
      }
      setCustomerForm({ name: '', email: '', phone: '', address: '' });
      setEditingCustomer(null);

      // Close modal
      const modalElement = document.getElementById('customerModal');
      const bootstrap = require('bootstrap');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal?.hide();

      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing customer profile');
    }
  };

  const handleEditClick = (cust: Customer) => {
    setEditingCustomer(cust);
    setCustomerForm({
      name: cust.name,
      email: cust.email || '',
      phone: cust.phone || '',
      address: cust.address || ''
    });

    const modalElement = document.getElementById('customerModal');
    const bootstrap = require('bootstrap');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      alert('Customer successfully removed');
      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot delete customer with purchase history');
    }
  };

  const handleHistoryClick = async (cust: Customer) => {
    try {
      const res = await api.get(`/customers/${cust.id}`);
      setActiveHistoryCustomer(res.data);

      const modalElement = document.getElementById('customerHistoryModal');
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    } catch (err) {
      alert('Error fetching customer history logs');
    }
  };

  return (
    <AuthLayout>
      {/* Search and Action Bar */}
      <div className="card p-3 border-none rounded-lg shadow-sm mb-4" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-8">
            <input
              type="text"
              className="form-control"
              placeholder="Search CRM customers directory by name, phone or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="col-12 col-md-4 text-md-end">
            <button
              className="btn btn-primary rounded-md d-flex align-items-center gap-2 ms-auto"
              data-bs-toggle="modal"
              data-bs-target="#customerModal"
              onClick={() => {
                setEditingCustomer(null);
                setCustomerForm({ name: '', email: '', phone: '', address: '' });
              }}
            >
              <i className="bi bi-person-plus-fill"></i>
              <span>Register Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card border-none rounded-lg p-4 shadow-sm" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-people-fill text-primary"></i>
          CRM Client Directory
        </h5>
        
        <div className="table-responsive">
          <table className="table custom-table m-0">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Physical Address</th>
                <th>Loyalty Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">No customers registered in directory</td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id}>
                    <td className="fw-bold text-dark">{cust.name}</td>
                    <td>{cust.phone || <span className="text-muted fs-8">None</span>}</td>
                    <td>{cust.email || <span className="text-muted fs-8">None</span>}</td>
                    <td className="text-muted">{cust.address || <span className="text-muted fs-8">None</span>}</td>
                    <td>
                      <span className="badge bg-warning-subtle text-warning-emphasis px-2.5 py-1 rounded-pill fw-bold">
                        {cust.points} pts
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-warning text-dark border-warning py-1 px-2.5 rounded-md" onClick={() => handleHistoryClick(cust)} style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-clock-history me-1"></i>Sales
                        </button>
                        <button className="btn btn-sm btn-outline-primary border-0 p-1" onClick={() => handleEditClick(cust)}><i className="bi bi-pencil-square"></i></button>
                        <button className="btn btn-sm btn-outline-danger border-0 p-1" onClick={() => handleDelete(cust.id)}><i className="bi bi-trash3-fill"></i></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-4">
            <span className="text-muted fs-7">Showing page {page} of {totalPages}</span>
            <div className="btn-group">
              <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MODAL 1: ADD/EDIT CUSTOMER MODAL
          ========================================== */}
      <div className="modal fade text-dark" id="customerModal" tabIndex={-1} aria-labelledby="customerModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-lg">
            <div className="modal-header bg-primary text-white border-none p-3.5">
              <h5 className="modal-title fw-bold" id="customerModalLabel">
                <i className="bi bi-person-fill-gear me-2"></i>{editingCustomer ? 'Edit Client Profile' : 'Register Client Profile'}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleCustomerSubmit}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Customer Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Richard Hendricks"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Telephone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. +1 555-0199"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="E.g. richard@piedpiper.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Billing/Physical Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Palo Alto, CA"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer border-top p-3">
                <button type="button" className="btn btn-light rounded-md" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary rounded-md">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL 2: CUSTOMER PURCHASE HISTORY MODAL
          ========================================== */}
      <div className="modal fade text-dark" id="customerHistoryModal" tabIndex={-1} aria-labelledby="customerHistoryModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg rounded-lg">
            <div className="modal-header bg-dark text-white border-none p-3.5">
              <h5 className="modal-title fw-bold" id="customerHistoryModalLabel">
                <i className="bi bi-clock-history me-2 text-warning"></i>Purchase history logs - {activeHistoryCustomer?.name}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4">
              <div className="table-responsive">
                <table className="table custom-table m-0">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Subtotal</th>
                      <th>Tax</th>
                      <th>Discount</th>
                      <th>Total Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!activeHistoryCustomer?.sales || activeHistoryCustomer.sales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">No purchases made by this customer yet</td>
                      </tr>
                    ) : (
                      activeHistoryCustomer.sales.map((sale: any) => (
                        <tr key={sale.id}>
                          <td className="fw-bold text-primary">{sale.invoiceNo}</td>
                          <td>Rs. {sale.subtotal.toFixed(2)}</td>
                          <td>Rs. {sale.taxAmount.toFixed(2)}</td>
                          <td className="text-danger">Rs. {sale.discountAmount.toFixed(2)}</td>
                          <td className="fw-bold text-dark">Rs. {sale.totalAmount.toFixed(2)}</td>
                          <td>{formatAdToBs(sale.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer border-top p-3">
              <button type="button" className="btn btn-light rounded-md fw-bold" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
