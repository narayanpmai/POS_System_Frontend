'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import BSDatePicker from '@/components/BSDatePicker';

import TableControls, { applyPagination } from '@/components/TableControls';
export default function IncomesPage() {
  const router = useRouter();
  const { token, api, activeFiscalYear } = useAuth();
  const { t } = useLanguage();
  
  // Tabs & Lists State
  const [activeTab, setActiveTab] = useState<'incomes' | 'categories'>('incomes');
  const [incomes, setIncomes] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [selectedIncome, setSelectedIncome] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Income Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  // Category Form State
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, activeFiscalYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes, settingsRes] = await Promise.all([
        api.get('/incomes'),
        api.get('/income-categories'),
        api.get('/settings')
      ]);
      setIncomes(expRes.data || []);
      setCategories(catRes.data || []);
      setStoreSettings(settingsRes?.data || null);
    } catch (err) {
      console.error('Error loading incomes data:', err);
    }
    setLoading(false);
  };

  // --- INCOME HANDLERS ---
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNo.trim() || !amount) return;

    const payload = {
      referenceNo: referenceNo.trim(),
      category: category || categories[0]?.name || 'Miscellaneous',
      amount: Number(amount),
      description: description.trim() || undefined,
      date: date || new Date().toISOString().split('T')[0]
    };

    try {
      if (isEditing && editingIncomeId) {
        await api.put(`/incomes/${editingIncomeId}`, payload);
        alert(t('incomes', 'success_update'));
      } else {
        await api.post('/incomes', payload);
        alert(t('incomes', 'success_add'));
      }

      // Close modal
      const modalElement = document.getElementById('incomeModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  
  const handleViewReceipt = (income: any) => {
    setSelectedIncome(income);
    const modalElement = document.getElementById('viewReceiptModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleEditIncome = (exp: any) => {
    setReferenceNo(exp.referenceNo || `INC-${Math.floor(Math.random() * 1000000000)}`);
    setDate(exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setCategory(exp.category || categories[0]?.name || 'Miscellaneous');
    setAmount(exp.amount);
    setDescription(exp.description || '');
    setEditingIncomeId(exp.id);
    setIsEditing(true);

    const modalElement = document.getElementById('incomeModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDeleteIncome = async (id: number) => {
    if (!confirm(t('incomes', 'confirm_delete'))) return;
    try {
      await api.delete(`/incomes/${id}`);
      alert(t('incomes', 'success_delete'));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const handleAddIncomeClick = () => {
    setReferenceNo(`INC-${Math.floor(Math.random() * 1000000000)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(categories[0]?.name || '');
    setAmount('');
    setDescription('');
    setIsEditing(false);
    setEditingIncomeId(null);

    const modalElement = document.getElementById('incomeModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  // --- CATEGORY HANDLERS ---
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    const payload = {
      name: categoryName.trim(),
      description: categoryDescription.trim() || undefined
    };

    try {
      if (isEditingCategory && editingCategoryId) {
        await api.put(`/income-categories/${editingCategoryId}`, payload);
        alert(t('common', 'updated_successfully'));
      } else {
        await api.post('/income-categories', payload);
        alert(t('common', 'saved_successfully'));
      }

      // Close modal
      const modalElement = document.getElementById('incomeCategoryModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const handleEditCategory = (cat: any) => {
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setEditingCategoryId(cat.id);
    setIsEditingCategory(true);

    const modalElement = document.getElementById('incomeCategoryModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm(t('common', 'confirm_delete'))) return;
    try {
      await api.delete(`/income-categories/${id}`);
      alert(t('common', 'deleted_successfully'));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const handleAddCategoryClick = () => {
    setCategoryName('');
    setCategoryDescription('');
    setIsEditingCategory(false);
    setEditingCategoryId(null);

    const modalElement = document.getElementById('incomeCategoryModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  return (
    <AuthLayout>
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <h4 className="fw-bold m-0 text-dark">{t('incomes', 'title') || 'Incomes'}</h4>
      </div>
      {/* Tab Selectors & Header Action */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <ul className="nav nav-pills border-0 bg-white p-1 rounded-pill shadow-sm" style={{ border: '1px solid #dee2e6' }}>
          <li className="nav-item">
            <button
              className={`nav-link rounded-pill fw-bold px-4 py-2 d-flex align-items-center ${activeTab === 'incomes' ? 'text-white' : 'text-secondary bg-transparent border-0'}`}
              style={activeTab === 'incomes' ? { backgroundColor: '#991b1b' } : {}}
              onClick={() => setActiveTab('incomes')}
            >
              <i className="bi bi-receipt me-2"></i>All Incomes
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link rounded-pill fw-bold px-4 py-2 d-flex align-items-center ${activeTab === 'categories' ? 'text-white' : 'text-secondary bg-transparent border-0'}`}
              style={activeTab === 'categories' ? { backgroundColor: '#991b1b' } : {}}
              onClick={() => setActiveTab('categories')}
            >
              <i className="bi bi-tags me-2"></i>Income Categories
            </button>
          </li>
        </ul>

        {activeTab === 'incomes' ? (
          <button className="btn d-flex align-items-center gap-2 px-3 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: '#991b1b', borderRadius: '8px' }} onClick={handleAddIncomeClick}>
            <i className="bi bi-plus-circle"></i> {t('incomes', 'add_income')}
          </button>
        ) : (
          <button className="btn d-flex align-items-center gap-2 px-3 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: '#991b1b', borderRadius: '8px' }} onClick={handleAddCategoryClick}>
            <i className="bi bi-plus-circle"></i> {t('common', 'add')}
          </button>
        )}
      </div>

      {/* ==========================================
          TAB 1: INCOMES DISPLAY
          ========================================== */}
      {activeTab === 'incomes' && (
        <div className="card border-0 rounded-md shadow-sm p-4" style={{ backgroundColor: 'var(--light-card)' }}>
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                  <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '15%' }}>{t('incomes', 'income_date')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('common', 'reference')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('incomes', 'income_category')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '15%' }}>{t('incomes', 'income_amount')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('incomes', 'income_notes')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>{t('common', 'actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">{t('incomes', 'loading_incomes')}</td>
                  </tr>
                ) : incomes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">{t('incomes', 'no_incomes')}</td>
                  </tr>
                ) : (
                  applyPagination(incomes, currentPage, rowsPerPage).map((exp) => (
                    <tr key={exp.id}>
                      <td className="ps-3 border-bottom py-3 text-secondary">{formatAdToBs(exp.date)}</td>
                      <td className="border-bottom fw-bold text-dark">{exp.referenceNo || `INC-${exp.id}`}</td>
                      <td className="border-bottom text-dark">
                        <span className="badge bg-secondary-subtle text-dark px-2.5 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="border-bottom fw-bold text-danger">Rs. {exp.amount.toFixed(2)}</td>
                      <td className="border-bottom text-secondary">{exp.description || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                      <td className="border-bottom text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button className="btn btn-sm btn-outline-primary p-1 px-2 d-flex align-items-center" onClick={() => handleViewReceipt(exp)} style={{ borderColor: '#0d6efd', color: '#0d6efd' }} title="Print Receipt">
                            <i className="bi bi-printer-fill"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEditIncome(exp)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDeleteIncome(exp.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
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
          total={incomes.length}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
          onPageChange={setCurrentPage}
        />
        </div>
      )}

      {/* ==========================================
          TAB 2: INCOME CATEGORIES DISPLAY
          ========================================== */}
      {activeTab === 'categories' && (
        <div className="card border-0 rounded-md shadow-sm p-4" style={{ backgroundColor: 'var(--light-card)' }}>
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                  <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '30%' }}>Category Name</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '50%' }}>Description</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '20%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-5 text-muted">Loading income categories...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-5 text-muted">No income categories found. Click "Add Category" to create one.</td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="ps-3 border-bottom py-3 fw-bold text-dark">{cat.name}</td>
                      <td className="border-bottom text-secondary">{cat.description || <span className="text-muted fs-8">No description provided</span>}</td>
                      <td className="border-bottom text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEditCategory(cat)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDeleteCategory(cat.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
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
      )}

      {/* ==========================================
          MODAL: LOG INCOME FORM
          ========================================== */}
      <div className="modal fade text-dark" id="incomeModal" tabIndex={-1} aria-labelledby="incomeModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h5 className="modal-title fw-bold text-dark m-0" id="incomeModalLabel" style={{ fontSize: '1.1rem' }}>
                {isEditing ? t('incomes', 'edit_income') : t('incomes', 'add_income')}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" style={{ fontSize: '0.8rem' }}></button>
            </div>
            <form onSubmit={handleIncomeSubmit}>
              <div className="modal-body p-4" style={{ backgroundColor: 'var(--light-card)' }}>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('common', 'reference')}</label>
                  <input
                    type="text"
                    className="form-control border-1 p-2"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    required
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('common', 'bs_date')}</label>
                  <BSDatePicker
                    value={date}
                    onChange={(val) => setDate(val)}
                    className="form-control border-1 p-2"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('incomes', 'income_category')}</label>
                  <select 
                    className="form-select border-1 p-2" 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ borderRadius: '6px' }}
                    required
                  >
                    {categories.length === 0 ? (
                      <option value="">No Categories Configured</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('common', 'amount')} (Rs.)</label>
                  <input
                    type="number" min="0" step="any"
                    
                    className="form-control border-1 p-2"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                    required
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('incomes', 'income_notes')}</label>
                  <textarea
                    className="form-control border-1 p-2"
                    rows={3}
                    placeholder="Income details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ borderRadius: '6px', resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 p-3 bg-white d-flex justify-content-end">
                <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold animate-pulse" style={{ backgroundColor: '#991b1b', border: 'none', borderRadius: '4px', fontSize: '0.9rem' }}>
                  {t('incomes', 'save_income')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL: ADD/EDIT INCOME CATEGORY FORM
          ========================================== */}
      <div className="modal fade text-dark" id="incomeCategoryModal" tabIndex={-1} aria-labelledby="incomeCategoryModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h5 className="modal-title fw-bold text-dark m-0" id="incomeCategoryModalLabel" style={{ fontSize: '1.1rem' }}>
                {isEditingCategory ? 'Edit Income Category' : 'Add Income Category'}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" style={{ fontSize: '0.8rem' }}></button>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="modal-body p-4" style={{ backgroundColor: 'var(--light-card)' }}>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">Category Name</label>
                  <input
                    type="text"
                    className="form-control border-1 p-2"
                    placeholder="e.g. Travel & Lodging"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">Description</label>
                  <textarea
                    className="form-control border-1 p-2"
                    rows={3}
                    placeholder="Brief description of incomes under this category..."
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    style={{ borderRadius: '6px', resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 p-3 bg-white d-flex justify-content-end">
                <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold" style={{ backgroundColor: '#991b1b', border: 'none', borderRadius: '4px', fontSize: '0.9rem' }}>
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    
      {/* ==============================================
          MODAL: VIEW RECEIPT
          ============================================== */}
      <div className="modal fade text-dark" id="viewReceiptModal" tabIndex={-1} aria-hidden="true" data-bs-backdrop="static">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
          <div className="modal-content border-0 shadow-lg rounded-lg" style={{ borderRadius: '12px' }}>
            <div className="modal-header bg-dark text-white border-none p-3 no-print">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-receipt me-2 text-warning"></i>Income Receipt
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-3">
              
              {/* Receipt formatting for window.print() */}
              <div id="printable-receipt-modal" className="thermal-receipt mx-auto">
                <div className="text-center">
                  <h5 className="m-0 fw-bold" style={{ fontFamily: 'Outfit' }}>
                    {storeSettings?.storeName || 'KOSELIGHAR POS'}
                  </h5>
                  <p className="m-0 text-muted" style={{ fontSize: '10px' }}>
                    {storeSettings?.address || '123 Retail Plaza'}<br />
                    Tel: {storeSettings?.phone || '+1 555-0100'}<br />
                    TAX No: {storeSettings?.taxNumber || 'TAX-VAT-8292'}
                  </p>
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>
                
                <h6 className="text-center fw-bold m-0 py-1">INCOME RECEIPT</h6>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                <div style={{ fontSize: '11px' }}>
                  <strong>Reference:</strong> {selectedIncome?.referenceNo || ''}<br />
                  <strong>Date:</strong> {selectedIncome ? formatAdToBs(selectedIncome.date) : ''}<br />
                  <strong>Category:</strong> {selectedIncome?.category}
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                <div className="font-mono" style={{ fontSize: '11px' }}>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Description:</span>
                    <span className="text-end" style={{ maxWidth: '150px' }}>{selectedIncome?.description || 'N/A'}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-2 fs-6">
                    <span>TOTAL AMOUNT:</span>
                    <span>Rs. {Number(selectedIncome?.amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                <div className="text-center font-mono mt-3" style={{ fontSize: '10px' }}>
                  <p className="m-0 text-muted">Received with thanks!</p>
                  <p className="m-0 text-muted">{storeSettings?.receiptFooter || ''}</p>
                </div>
              </div>

            </div>
            <div className="modal-footer border-top p-3 no-print d-flex flex-nowrap justify-content-end gap-2">
              <button type="button" className="btn btn-light btn-sm rounded-md border" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary btn-sm rounded-md d-flex align-items-center gap-1" onClick={handlePrintReceipt}>
                <i className="bi bi-printer-fill"></i> Print
              </button>
            </div>
          </div>
        </div>
      </div>

    </AuthLayout>
  );
}
