'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useModal } from '@/context/ModalContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import TableControls from '@/components/TableControls';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  points: number;
  walletBalance: number;
  membershipTier?: {
    id: number;
    name: string;
    discountPercent: number;
  };
  sales?: any[];
}

export default function CustomersPage() {
  const router = useRouter();
  const { token, api } = useAuth();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalCustomers, setTotalCustomers] = useState(0);

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
      const res = await api.get(`/customers?page=${currentPage}&limit=${rowsPerPage}&search=${search}`);
      setCustomers(res.data.items || []);
      setTotalCustomers(res.data.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers directory:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [token, currentPage, rowsPerPage, search]);

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
        showAlert('Customer profile updated successfully!', { type: 'success', title: 'Success' });
      } else {
        await api.post('/customers', payload);
        showAlert('Customer profile created successfully!', { type: 'success', title: 'Success' });
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
      showAlert(err.response?.data?.message || 'Error processing customer profile', { type: 'danger', title: 'Error' });
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
    const confirmed = await showConfirm(
      'Are you sure you want to delete this customer? This action cannot be undone.',
      { title: 'Delete Customer', confirmText: 'Delete', cancelText: 'Cancel' }
    );
    if (!confirmed) return;

    try {
      await api.delete(`/customers/${id}`);
      showAlert('Customer successfully removed', { type: 'success', title: 'Customer Deleted' });
      loadCustomers();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Cannot delete customer with purchase history', { type: 'warning', title: 'Cannot Delete' });
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
      showAlert('Error fetching customer history logs', { type: 'danger', title: 'Error' });
    }
  };

  return (
    <AuthLayout>
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
          <i className="bi bi-arrow-left me-1"></i>Back
        </button>
      </div>

      {/* Header section */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t('customer', 'customer_directory')}</h2>
          <p className="text-muted small m-0">{t('customer', 'subtitle')}</p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2 fw-semibold px-3 py-2 rounded-md shadow-sm"
          onClick={() => {
            setEditingCustomer(null);
            setCustomerForm({ name: '', email: '', phone: '', address: '' });
            const modalElement = document.getElementById('customerModal');
            const bootstrap = require('bootstrap');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
          }}
        >
          <i className="bi bi-person-plus-fill"></i>
          <span>{t('customer', 'add_customer')}</span>
        </button>
      </div>

      {/* Main Directory Table Container */}
      <div className="card border-0 shadow-sm rounded-lg p-3">
        {/* Search Control */}
        <div className="row g-2 mb-3">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white text-muted border-end-0">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder={t('customer', 'search_placeholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="table-responsive">
          <table className="table custom-table m-0 align-middle">
            <thead>
              <tr>
                <th>{t('customer', 'customer_name')}</th>
                <th>{t('common', 'phone')}</th>
                <th>{t('common', 'email')}</th>
                <th>Membership / Wallet</th>
                <th>Points Balance</th>
                <th>{t('common', 'actions')}</th>
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
                  <td colSpan={6} className="text-center py-4 text-muted">{t('customer', 'no_customers')}</td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id}>
                    <td className="fw-bold text-dark">{cust.name}</td>
                    <td>{cust.phone || <span className="text-muted fs-8">None</span>}</td>
                    <td>{cust.email || <span className="text-muted fs-8">None</span>}</td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        {cust.membershipTier ? (
                          <span className="badge bg-primary w-auto d-inline-block">{cust.membershipTier.name} ({cust.membershipTier.discountPercent}%)</span>
                        ) : (
                          <span className="badge bg-secondary w-auto d-inline-block">Basic</span>
                        )}
                        <span className="text-success fw-bold fs-7">Wallet: Rs. {cust.walletBalance.toFixed(2)}</span>
                      </div>
                    </td>
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

        <TableControls
          total={totalCustomers}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(n) => {
            setRowsPerPage(n);
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ==========================================
          MODAL 1: ADD/EDIT CUSTOMER MODAL
          ========================================== */}
      <div className="modal fade text-dark" id="customerModal" tabIndex={-1} aria-labelledby="customerModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-lg">
            <div className="modal-header bg-primary text-white border-none p-3.5">
              <h5 className="modal-title fw-bold" id="customerModalLabel">
                <i className="bi bi-person-fill-gear me-2"></i>{editingCustomer ? t('customer', 'edit_customer') : t('customer', 'add_customer')}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleCustomerSubmit}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">{t('customer', 'customer_name')}</label>
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
                  <label className="form-label fw-semibold">{t('common', 'phone')}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. +1 555-0199"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">{t('common', 'email')}</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="E.g. richard@piedpiper.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">{t('common', 'address')}</label>
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
                <button type="button" className="btn btn-light rounded-md" data-bs-dismiss="modal">{t('common', 'cancel')}</button>
                <button type="submit" className="btn btn-primary rounded-md">{t('common', 'save')}</button>
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
                      <th>{t('sales', 'invoice_no')}</th>
                      <th>{t('common', 'subtotal')}</th>
                      <th>{t('common', 'tax')}</th>
                      <th>{t('common', 'discount')}</th>
                      <th>{t('common', 'total')}</th>
                      <th>{t('common', 'date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!activeHistoryCustomer?.sales || activeHistoryCustomer.sales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">{t('customer', 'purchase_history')} — {t('common', 'no_data')}</td>
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
              <button type="button" className="btn btn-light rounded-md fw-bold" data-bs-dismiss="modal">{t('common', 'close')}</button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
