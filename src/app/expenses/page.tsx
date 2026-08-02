'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import TableControls from '@/components/TableControls';
import { useCustomAlert } from '@/context/CustomAlertContext';
import {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from '@/redux/api/expensesApi';

export default function ExpensesPage() {
  const router = useRouter();
  const { token, api, activeFiscalYear } = useAuth();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useCustomAlert();
  
  // Tabs & Lists State
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
  const [categories, setCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  // RTK Query for Expenses
  const { data: expenseData, isFetching: loading } = useGetExpensesQuery({
    page: currentPage,
    limit: rowsPerPage,
    search,
  });
  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const expenses: any[] = expenseData?.items || [];
  const totalExpenses = expenseData?.total || 0;

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
    loadCategories();
  }, [token, activeFiscalYear]);

  const loadCategories = async () => {
    setCatLoading(true);
    try {
      const catRes = await api.get('/expense-categories');
      setCategories(catRes.data?.items || catRes.data || []);
    } catch (err) {
      console.error('Error loading expense categories:', err);
    }
    setCatLoading(false);
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
        await updateExpense({ id: editingExpenseId, data: payload }).unwrap();
        showAlert(t('expenses', 'success_update'), 'Success', 'success');
      } else {
        await createExpense(payload).unwrap();
        showAlert(t('expenses', 'success_add'), 'Success', 'success');
      }

      // Close modal
      const modalElement = document.getElementById('expenseModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }
    } catch (err: any) {
      showAlert(err?.data?.message || err?.message || t('common', 'error'), 'Expense Error', 'error');
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
    showConfirm(
      t('expenses', 'confirm_delete'),
      async () => {
        try {
          await deleteExpense(id).unwrap();
          showAlert(t('expenses', 'success_delete'), 'Deleted', 'success');
        } catch (err: any) {
          showAlert(err?.data?.message || t('common', 'error'), 'Delete Failed', 'error');
        }
      },
      'Delete Expense',
      'Yes, Delete',
      'error'
    );
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
        showAlert(t('common', 'success_update') || 'Category updated', 'Success', 'success');
      } else {
        await api.post('/expense-categories', payload);
        showAlert(t('common', 'success_add') || 'Category created', 'Success', 'success');
      }

      setCategoryName('');
      setCategoryDescription('');
      setIsEditingCategory(false);
      setEditingCategoryId(null);

      const modalElement = document.getElementById('expenseCategoryModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadCategories();
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('common', 'error'), 'Category Error', 'error');
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
    showConfirm(
      'Are you sure you want to delete this expense category?',
      async () => {
        try {
          await api.delete(`/expense-categories/${id}`);
          showAlert('Expense category deleted', 'Deleted', 'success');
          loadCategories();
        } catch (err: any) {
          showAlert(err.response?.data?.message || t('common', 'error'), 'Delete Failed', 'error');
        }
      },
      'Delete Expense Category',
      'Yes, Delete',
      'error'
    );
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
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <h4 className="fw-bold m-0 text-dark">{t('expenses', 'title') || 'Expenses'}</h4>
      </div>

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
          {/* Search */}
          <div className="mb-3 col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>

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
                      <td className="border-bottom fw-bold text-danger">Rs. {Number(exp.amount).toFixed(2)}</td>
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

          <TableControls
            total={totalExpenses}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
            onPageChange={setCurrentPage}
          />
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
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '20%' }}>{t('common', 'actions')}</th>
                </tr>
              </thead>
              <tbody>
                {catLoading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-5 text-muted">Loading categories...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-5 text-muted">No expense categories found.</td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="ps-3 border-bottom fw-bold text-dark">{cat.name}</td>
                      <td className="border-bottom text-secondary">{cat.description || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
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

      {/* EXPENSE MODAL */}
      <div className="modal fade" id="expenseModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-dark">
                {isEditing ? t('expenses', 'edit_expense') : t('expenses', 'add_expense')}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div className="modal-body py-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">{t('common', 'reference')} *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">{t('expenses', 'expense_date')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">{t('expenses', 'expense_category')}</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {categories.length === 0 && <option value="Miscellaneous">Miscellaneous</option>}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">{t('expenses', 'expense_amount')} (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">{t('expenses', 'expense_notes')}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">{t('common', 'cancel')}</button>
                <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#991b1b', borderColor: '#991b1b' }}>
                  {t('common', 'save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* EXPENSE CATEGORY MODAL */}
      <div className="modal fade" id="expenseCategoryModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-dark">
                {isEditingCategory ? 'Edit Category' : 'Add Expense Category'}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="modal-body py-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">Category Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">Description</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">{t('common', 'cancel')}</button>
                <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#991b1b', borderColor: '#991b1b' }}>
                  {t('common', 'save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
