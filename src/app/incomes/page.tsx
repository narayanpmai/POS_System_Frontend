'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import TableControls from '@/components/TableControls';
import { toSafeArray } from '@/utils/array';
import {
  useGetIncomesQuery,
  useCreateIncomeMutation,
  useUpdateIncomeMutation,
  useDeleteIncomeMutation,
} from '@/redux/api/incomesApi';

export default function IncomesPage() {
  const router = useRouter();
  const { token, api, activeFiscalYear } = useAuth();
  const { t } = useLanguage();
  
  // Tabs & Lists State
  const [activeTab, setActiveTab] = useState<'incomes' | 'categories'>('incomes');
  const [categories, setCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryRowsPerPage, setCategoryRowsPerPage] = useState(10);

  // Search State
  const [search, setSearch] = useState('');

  // RTK Query for Incomes
  const { data: incomeData, isFetching: loading } = useGetIncomesQuery({
    page: currentPage,
    limit: rowsPerPage,
    search,
  });
  const [createIncome] = useCreateIncomeMutation();
  const [updateIncome] = useUpdateIncomeMutation();
  const [deleteIncome] = useDeleteIncomeMutation();

  const incomes: any[] = toSafeArray(incomeData);
  const totalIncomes = incomeData?.total || 0;

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
    loadAuxData();
  }, [token, activeFiscalYear]);

  const loadAuxData = async () => {
    setCatLoading(true);
    try {
      const [catRes, settingsRes] = await Promise.all([
        api.get('/income-categories'),
        api.get('/settings')
      ]);
      setCategories(toSafeArray(catRes.data));
      setStoreSettings(settingsRes?.data || null);
    } catch (err) {
      console.error('Error loading income categories:', err);
    }
    setCatLoading(false);
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
        await updateIncome({ id: editingIncomeId, data: payload }).unwrap();
        alert(t('incomes', 'success_update'));
      } else {
        await createIncome(payload).unwrap();
        alert(t('incomes', 'success_add'));
      }

      // Close modal
      const modalElement = document.getElementById('incomeModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }
    } catch (err: any) {
      alert(err?.data?.message || err?.message || t('common', 'error'));
    }
  };

  const handleEditIncome = (inc: any) => {
    setReferenceNo(inc.referenceNo || `INC-${Math.floor(Math.random() * 1000000000)}`);
    setDate(inc.date ? new Date(inc.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setCategory(inc.category || categories[0]?.name || 'Miscellaneous');
    setAmount(inc.amount);
    setDescription(inc.description || '');
    setEditingIncomeId(inc.id);
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
      await deleteIncome(id).unwrap();
      alert(t('incomes', 'success_delete'));
    } catch (err: any) {
      alert(err?.data?.message || t('common', 'error'));
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
        alert(t('common', 'success_update') || 'Category updated');
      } else {
        await api.post('/income-categories', payload);
        alert(t('common', 'success_add') || 'Category created');
      }

      setCategoryName('');
      setCategoryDescription('');
      setIsEditingCategory(false);
      setEditingCategoryId(null);

      const modalElement = document.getElementById('incomeCategoryModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadAuxData();
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
    if (!confirm('Are you sure you want to delete this income category?')) return;
    try {
      await api.delete(`/income-categories/${id}`);
      alert('Income category deleted');
      loadAuxData();
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
              style={activeTab === 'incomes' ? { backgroundColor: '#15803d' } : {}}
              onClick={() => setActiveTab('incomes')}
            >
              <i className="bi bi-receipt me-2"></i>All Incomes
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link rounded-pill fw-bold px-4 py-2 d-flex align-items-center ${activeTab === 'categories' ? 'text-white' : 'text-secondary bg-transparent border-0'}`}
              style={activeTab === 'categories' ? { backgroundColor: '#15803d' } : {}}
              onClick={() => setActiveTab('categories')}
            >
              <i className="bi bi-tags me-2"></i>Income Categories
            </button>
          </li>
        </ul>

        {activeTab === 'incomes' ? (
          <button className="btn d-flex align-items-center gap-2 px-3 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: '#15803d', borderRadius: '8px' }} onClick={handleAddIncomeClick}>
            <i className="bi bi-plus-circle"></i> {t('incomes', 'add_income')}
          </button>
        ) : (
          <button className="btn d-flex align-items-center gap-2 px-3 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: '#15803d', borderRadius: '8px' }} onClick={handleAddCategoryClick}>
            <i className="bi bi-plus-circle"></i> {t('common', 'add')}
          </button>
        )}
      </div>

      {/* ==========================================
          TAB 1: INCOMES DISPLAY
          ========================================== */}
      {activeTab === 'incomes' && (
        <div className="card border-0 rounded-md shadow-sm p-4" style={{ backgroundColor: 'var(--light-card)' }}>
          {/* Search */}
          <div className="mb-3 col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search incomes..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>

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
                  incomes.map((inc) => (
                    <tr key={inc.id}>
                      <td className="ps-3 border-bottom py-3 text-secondary">{formatAdToBs(inc.date)}</td>
                      <td className="border-bottom fw-bold text-dark">{inc.referenceNo || `INC-${inc.id}`}</td>
                      <td className="border-bottom text-dark">
                        <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                          {inc.category}
                        </span>
                      </td>
                      <td className="border-bottom fw-bold text-success">Rs. {Number(inc.amount).toFixed(2)}</td>
                      <td className="border-bottom text-secondary">{inc.description || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                      <td className="border-bottom text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEditIncome(inc)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDeleteIncome(inc.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
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
            total={totalIncomes}
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
                    <td colSpan={3} className="text-center py-5 text-muted">No income categories found.</td>
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

      {/* INCOME MODAL */}
      <div className="modal fade" id="incomeModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-dark">
                {isEditing ? t('incomes', 'edit_income') : t('incomes', 'add_income')}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleIncomeSubmit}>
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
                  <label className="form-label fw-semibold text-secondary">{t('incomes', 'income_date')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">{t('incomes', 'income_category')}</label>
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
                  <label className="form-label fw-semibold text-secondary">{t('incomes', 'income_amount')} (Rs.) *</label>
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
                  <label className="form-label fw-semibold text-secondary">{t('incomes', 'income_notes')}</label>
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
                <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}>
                  {t('common', 'save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* INCOME CATEGORY MODAL */}
      <div className="modal fade" id="incomeCategoryModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-dark">
                {isEditingCategory ? 'Edit Category' : 'Add Income Category'}
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
                <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}>
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
