'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import BSDatePicker from '@/components/BSDatePicker';

export default function ExpensesPage() {
  const { token, api, activeFiscalYear } = useAuth();
  const { t } = useLanguage();
  
  // Tabs & Lists State
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
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
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expense-categories')
      ]);
      setExpenses(expRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Error loading expenses data:', err);
    }
    setLoading(false);
  };

  // --- EXPENSE HANDLERS ---
  const handleExpenseSubmit = async (e: React.FormEvent) => {
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
      if (isEditing && editingExpenseId) {
        await api.put(`/expenses/${editingExpenseId}`, payload);
        alert(t('expenses', 'success_update'));
      } else {
        await api.post('/expenses', payload);
        alert(t('expenses', 'success_add'));
      }

      // Close modal
      const modalElement = document.getElementById('expenseModal');
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

  const handleEditExpense = (exp: any) => {
    setReferenceNo(exp.referenceNo || `EXP-${Math.floor(Math.random() * 1000000000)}`);
    setDate(exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setCategory(exp.category || categories[0]?.name || 'Miscellaneous');
    setAmount(exp.amount);
    setDescription(exp.description || '');
    setEditingExpenseId(exp.id);
    setIsEditing(true);

    const modalElement = document.getElementById('expenseModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm(t('expenses', 'confirm_delete'))) return;
    try {
      await api.delete(`/expenses/${id}`);
      alert(t('expenses', 'success_delete'));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common', 'error'));
    }
  };

  const handleAddExpenseClick = () => {
    setReferenceNo(`EXP-${Math.floor(Math.random() * 1000000000)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(categories[0]?.name || '');
    setAmount('');
    setDescription('');
    setIsEditing(false);
    setEditingExpenseId(null);

    const modalElement = document.getElementById('expenseModal');
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
        await api.put(`/expense-categories/${editingCategoryId}`, payload);
        alert(t('common', 'updated_successfully'));
      } else {
        await api.post('/expense-categories', payload);
        alert(t('common', 'saved_successfully'));
      }

      // Close modal
      const modalElement = document.getElementById('expenseCategoryModal');
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

    const modalElement = document.getElementById('expenseCategoryModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm(t('common', 'confirm_delete'))) return;
    try {
      await api.delete(`/expense-categories/${id}`);
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

    const modalElement = document.getElementById('expenseCategoryModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  return (
    <AuthLayout>
      {/* Tab Selectors & Header Action */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <ul className="nav nav-pills border-0 bg-white p-1 rounded-pill shadow-sm" style={{ border: '1px solid #dee2e6' }}>
          <li className="nav-item">
            <button
              className={`nav-link rounded-pill fw-bold px-4 py-2 d-flex align-items-center ${activeTab === 'expenses' ? 'text-white' : 'text-secondary bg-transparent border-0'}`}
              style={activeTab === 'expenses' ? { backgroundColor: '#991b1b' } : {}}
              onClick={() => setActiveTab('expenses')}
            >
              <i className="bi bi-receipt me-2"></i>All Expenses
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link rounded-pill fw-bold px-4 py-2 d-flex align-items-center ${activeTab === 'categories' ? 'text-white' : 'text-secondary bg-transparent border-0'}`}
              style={activeTab === 'categories' ? { backgroundColor: '#991b1b' } : {}}
              onClick={() => setActiveTab('categories')}
            >
              <i className="bi bi-tags me-2"></i>Expense Categories
            </button>
          </li>
        </ul>

        {activeTab === 'expenses' ? (
          <button className="btn d-flex align-items-center gap-2 px-3 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: '#991b1b', borderRadius: '8px' }} onClick={handleAddExpenseClick}>
            <i className="bi bi-plus-circle"></i> {t('expenses', 'add_expense')}
          </button>
        ) : (
          <button className="btn d-flex align-items-center gap-2 px-3 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: '#991b1b', borderRadius: '8px' }} onClick={handleAddCategoryClick}>
            <i className="bi bi-plus-circle"></i> {t('common', 'add')}
          </button>
        )}
      </div>

      {/* ==========================================
          TAB 1: EXPENSES DISPLAY
          ========================================== */}
      {activeTab === 'expenses' && (
        <div className="card border-0 rounded-md shadow-sm p-4" style={{ backgroundColor: 'var(--light-card)' }}>
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                  <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '15%' }}>{t('expenses', 'expense_date')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('common', 'reference')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('expenses', 'expense_category')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '15%' }}>{t('expenses', 'expense_amount')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('expenses', 'expense_notes')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>{t('common', 'actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">{t('expenses', 'loading_expenses')}</td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">{t('expenses', 'no_expenses')}</td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="ps-3 border-bottom py-3 text-secondary">{formatAdToBs(exp.date)}</td>
                      <td className="border-bottom fw-bold text-dark">{exp.referenceNo || `EXP-${exp.id}`}</td>
                      <td className="border-bottom text-dark">
                        <span className="badge bg-secondary-subtle text-dark px-2.5 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="border-bottom fw-bold text-danger">Rs. {exp.amount.toFixed(2)}</td>
                      <td className="border-bottom text-secondary">{exp.description || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                      <td className="border-bottom text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEditExpense(exp)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDeleteExpense(exp.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
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
          TAB 2: EXPENSE CATEGORIES DISPLAY
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
                    <td colSpan={3} className="text-center py-5 text-muted">Loading expense categories...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-5 text-muted">No expense categories found. Click "Add Category" to create one.</td>
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
          MODAL: LOG EXPENSE FORM
          ========================================== */}
      <div className="modal fade text-dark" id="expenseModal" tabIndex={-1} aria-labelledby="expenseModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h5 className="modal-title fw-bold text-dark m-0" id="expenseModalLabel" style={{ fontSize: '1.1rem' }}>
                {isEditing ? t('expenses', 'edit_expense') : t('expenses', 'add_expense')}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" style={{ fontSize: '0.8rem' }}></button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
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
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('expenses', 'expense_category')}</label>
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
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">{t('expenses', 'expense_notes')}</label>
                  <textarea
                    className="form-control border-1 p-2"
                    rows={3}
                    placeholder="Expense details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ borderRadius: '6px', resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 p-3 bg-white d-flex justify-content-end">
                <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold animate-pulse" style={{ backgroundColor: '#991b1b', border: 'none', borderRadius: '4px', fontSize: '0.9rem' }}>
                  {t('expenses', 'save_expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL: ADD/EDIT EXPENSE CATEGORY FORM
          ========================================== */}
      <div className="modal fade text-dark" id="expenseCategoryModal" tabIndex={-1} aria-labelledby="expenseCategoryModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h5 className="modal-title fw-bold text-dark m-0" id="expenseCategoryModalLabel" style={{ fontSize: '1.1rem' }}>
                {isEditingCategory ? 'Edit Expense Category' : 'Add Expense Category'}
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
                    placeholder="Brief description of expenses under this category..."
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
    </AuthLayout>
  );
}
