'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useLanguage } from '@/context/LanguageContext';
import TableControls from '@/components/TableControls';
import {
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} from '@/redux/api/brandsApi';
import { Formik } from 'formik';
import FormikInput from '@/components/form/FormikInput';
import FormikSelect from '@/components/form/FormikSelect';
import { brandValidationSchema } from '@/utils/validationSchemas';

export default function BrandsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  // RTK Query hooks
  const { data: brandData, isFetching: loading } = useGetBrandsQuery({
    page: currentPage,
    limit: rowsPerPage,
    search,
  });
  const [createBrand] = useCreateBrandMutation();
  const [updateBrand] = useUpdateBrandMutation();
  const [deleteBrand] = useDeleteBrandMutation();

  const brands: any[] = brandData?.items || [];
  const totalBrands = brandData?.total || 0;

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (isEditing && editingBrandId) {
        await updateBrand({ id: editingBrandId, data: { name, status } }).unwrap();
        alert(t('brands', 'success_update'));
      } else {
        await createBrand({ name, status }).unwrap();
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
    } catch (err: any) {
      alert(err?.data?.message || err?.message || t('common', 'error'));
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
      await deleteBrand(id).unwrap();
      alert(t('brands', 'success_delete'));
    } catch (err: any) {
      alert(err?.data?.message || t('brands', 'error_delete'));
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
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <h4 className="fw-bold m-0 text-dark">{t('brands', 'title')}</h4>
          </div>
          <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }} onClick={handleAddClick}>
            <i className="bi bi-plus-circle"></i> {t('brands', 'add_brand')}
          </button>
        </div>

        {/* Search */}
        <div className="mb-3 col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Search brands by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '10%' }}>{t('common', 'sn') || 'S.N.'}</th>
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
                brands.map((brand, index) => (
                  <tr key={brand.id}>
                    <td className="ps-3 border-bottom py-3 text-secondary">{(currentPage - 1) * rowsPerPage + index + 1}</td>
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
        <TableControls
          total={totalBrands}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal */}
      <div className="modal fade" id="brandModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-dark">
                {isEditing ? t('brands', 'edit_brand') : t('brands', 'add_brand')}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <Formik
              enableReinitialize
              initialValues={{
                name: name || '',
                status: status || 'ACTIVE',
              }}
              validationSchema={brandValidationSchema}
              onSubmit={async (values, { setSubmitting }) => {
                try {
                  if (isEditing && editingBrandId) {
                    await updateBrand({ id: editingBrandId, data: { name: values.name.trim(), status: values.status } }).unwrap();
                    alert(t('brands', 'success_update'));
                  } else {
                    await createBrand({ name: values.name.trim(), status: values.status }).unwrap();
                    alert(t('brands', 'success_add'));
                  }
                  setName('');
                  setStatus('ACTIVE');
                  setIsEditing(false);
                  setEditingBrandId(null);

                  const modalElement = document.getElementById('brandModal');
                  if (modalElement) {
                    const bootstrap = require('bootstrap');
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    modal?.hide();
                  }
                } catch (err: any) {
                  alert(err?.data?.message || err?.message || t('common', 'error'));
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ handleSubmit, isSubmitting }) => (
                <form onSubmit={handleSubmit}>
                  <div className="modal-body py-4">
                    <FormikInput
                      label={t('common', 'name')}
                      name="name"
                      placeholder="Enter brand name"
                      required
                    />
                    <FormikSelect
                      label={t('common', 'status')}
                      name="status"
                      options={[
                        { label: t('common', 'active'), value: 'ACTIVE' },
                        { label: t('common', 'inactive'), value: 'INACTIVE' },
                      ]}
                    />
                  </div>
                  <div className="modal-footer border-top-0 pt-0">
                    <button type="button" className="btn btn-light" data-bs-dismiss="modal">{t('common', 'cancel')}</button>
                    <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#0d6efd' }} disabled={isSubmitting}>
                      {t('common', 'save')}
                    </button>
                  </div>
                </form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
