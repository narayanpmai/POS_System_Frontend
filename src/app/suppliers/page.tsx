'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useLanguage } from '@/context/LanguageContext';
import TableControls from '@/components/TableControls';
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from '@/redux/api/suppliersApi';
import { Formik } from 'formik';
import FormikInput from '@/components/form/FormikInput';
import { supplierValidationSchema } from '@/utils/validationSchemas';

export default function SuppliersPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  // RTK Query hooks
  const { data: supplierData, isFetching: loading } = useGetSuppliersQuery({
    page: currentPage,
    limit: rowsPerPage,
    search,
  });
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();

  const suppliers: any[] = supplierData?.items || [];
  const totalSuppliers = supplierData?.total || 0;

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

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
        await updateSupplier({ id: editingSupplierId, data: payload }).unwrap();
        alert(t('suppliers', 'success_update'));
      } else {
        await createSupplier(payload).unwrap();
        alert(t('suppliers', 'success_add'));
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
    } catch (err: any) {
      alert(err?.data?.message || err?.message || t('common', 'error'));
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
    if (!confirm(t('suppliers', 'confirm_delete'))) return;
    try {
      await deleteSupplier(id).unwrap();
      alert(t('suppliers', 'success_delete'));
    } catch (err: any) {
      alert(err?.data?.message || t('suppliers', 'error_delete'));
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
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <h4 className="fw-bold m-0 text-dark">{t('suppliers', 'title')}</h4>
          </div>
          <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }} onClick={handleAddClick}>
            <i className="bi bi-plus-circle"></i> {t('suppliers', 'add_supplier')}
          </button>
        </div>

        {/* Search */}
        <div className="mb-3 col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Search suppliers by name, phone or email..."
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
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '25%' }}>{t('common', 'name')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('common', 'email')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '15%' }}>{t('common', 'phone')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '20%' }}>{t('common', 'address')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">{t('suppliers', 'loading_suppliers')}</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">{t('suppliers', 'no_suppliers')}</td>
                </tr>
              ) : (
                suppliers.map((supp, index) => (
                  <tr key={supp.id}>
                    <td className="ps-3 border-bottom py-3 text-secondary">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                    <td className="border-bottom fw-semibold text-dark">{supp.name}</td>
                    <td className="border-bottom text-secondary">{supp.email || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                    <td className="border-bottom text-secondary">{supp.phone || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
                    <td className="border-bottom text-secondary">{supp.address || <span className="text-muted fs-8">{t('common', 'none')}</span>}</td>
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
        <TableControls
          total={totalSuppliers}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal */}
      <div className="modal fade" id="supplierModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-dark">
                {isEditing ? t('suppliers', 'edit_supplier') : t('suppliers', 'add_supplier')}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <Formik
              enableReinitialize
              initialValues={{
                name: name || '',
                email: email || '',
                phone: phone || '',
                address: address || '',
              }}
              validationSchema={supplierValidationSchema}
              onSubmit={async (values, { setSubmitting }) => {
                const payload = {
                  name: values.name.trim(),
                  email: values.email?.trim() || undefined,
                  phone: values.phone?.trim() || undefined,
                  address: values.address?.trim() || undefined,
                };

                try {
                  if (isEditing && editingSupplierId) {
                    await updateSupplier({ id: editingSupplierId, data: payload }).unwrap();
                    alert(t('suppliers', 'success_update'));
                  } else {
                    await createSupplier(payload).unwrap();
                    alert(t('suppliers', 'success_add'));
                  }
                  
                  setName('');
                  setEmail('');
                  setPhone('');
                  setAddress('');
                  setIsEditing(false);
                  setEditingSupplierId(null);

                  const modalElement = document.getElementById('supplierModal');
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
                      placeholder="Enter supplier name"
                      required
                    />
                    <FormikInput
                      label={t('common', 'email')}
                      name="email"
                      type="email"
                      placeholder="supplier@example.com"
                    />
                    <FormikInput
                      label={t('common', 'phone')}
                      name="phone"
                      placeholder="Phone number"
                    />
                    <FormikInput
                      label={t('common', 'address')}
                      name="address"
                      type="textarea"
                      rows={2}
                      placeholder="Address details"
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
