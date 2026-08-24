'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import * as XLSX from 'xlsx';
import BSDatePicker from '@/components/BSDatePicker';
import TableControls from '@/components/TableControls';
import { printThermalReceipt } from '@/utils/printReceipt';
import { useGetSalesQuery } from '@/redux/api/salesApi';

export default function SalesHistoryPage() {
  const router = useRouter();
  const { token, api, activeFiscalYear, user } = useAuth();
  const { t, language } = useLanguage();
  
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  
  // For the invoice modal
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  // RTK Query for Sales
  const { data: salesData, isFetching: loading } = useGetSalesQuery({
    page: currentPage,
    limit: rowsPerPage,
    search,
    startDate,
    endDate,
    categoryId,
  });

  const sales: any[] = salesData?.items || [];
  const totalSales = salesData?.total || 0;
  const totalSalesAmount = salesData?.totalSalesAmount || 0;

  useEffect(() => {
    if (!token) return;
    api.get('/categories').then(res => setCategories(res.data?.items || res.data || [])).catch(console.error);
    api.get('/settings').then(res => setStoreSettings(res.data)).catch(console.error);
  }, [token, activeFiscalYear]);

  const formatDate = (dateString: string) => {
    return formatAdToBsFull(dateString);
  };

  const handleViewSale = (sale: any) => {
    setSelectedSale(sale);
    const modalElement = document.getElementById('viewReceiptModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handlePrintReceipt = () => {
    printThermalReceipt('printable-receipt-modal', storeSettings?.printCopies || 2);
  };

  const handleDownloadPDF = async () => {
    if (!selectedSale) return;

    const element = document.getElementById('printable-receipt-modal');
    if (!element) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [5, 5, 5, 5] as [number, number, number, number],
        filename: `Invoice_${selectedSale.invoiceNo}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: [80, 297] as any, orientation: 'portrait' as const }
      };

      html2pdf().set(opt as any).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Could not generate PDF. Please try printing instead.');
    }
  };

  const exportToExcel = () => {
    const dataToExport = sales.map((sale, index) => ({
      'S.N.': index + 1,
      'Invoice No': sale.invoiceNo,
      'Date (BS)': formatDate(sale.createdAt),
      'Customer': sale.customer?.name || 'Walk-in Customer',
      'Total Amount': sale.totalAmount,
      'Payment Status': sale.paymentStatus,
      'Payment Method': sale.paymentMethod || 'CASH'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    XLSX.writeFile(workbook, `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            <h4 className="fw-bold m-0 text-dark">{t('sales', 'title')}</h4>
          </div>

          <div className="d-flex gap-2">
            <button
              onClick={exportToExcel}
              className="btn btn-outline-success fw-bold d-flex align-items-center gap-2"
              style={{ borderRadius: '6px' }}
            >
              <i className="bi bi-file-earmark-excel"></i> Export Excel
            </button>
            <Link
              href="/pos"
              className="btn btn-primary fw-bold d-flex align-items-center gap-2"
              style={{ borderRadius: '6px' }}
            >
              <i className="bi bi-plus-circle"></i> {t('sales', 'new_sale')}
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <label className="form-label text-secondary fw-semibold">Search Invoice / Customer</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search invoice number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label text-secondary fw-semibold">{t('sales', 'from_date')}</label>
            <BSDatePicker
              value={startDate}
              onChange={(adDate) => {
                setStartDate(adDate);
                setCurrentPage(1);
              }}
              placeholder="Start Date"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label text-secondary fw-semibold">{t('sales', 'to_date')}</label>
            <BSDatePicker
              value={endDate}
              onChange={(adDate) => {
                setEndDate(adDate);
                setCurrentPage(1);
              }}
              placeholder="End Date"
            />
          </div>
          <div className="col-md-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label text-secondary fw-semibold m-0">{t('sales', 'filter_by_category')}</label>
              {(search || startDate || endDate || categoryId) && (
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger p-0 text-decoration-none fw-bold"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => {
                    setSearch('');
                    setStartDate('');
                    setEndDate('');
                    setCategoryId('');
                    setCurrentPage(1);
                  }}
                >
                  <i className="bi bi-x-circle"></i> Clear Filters
                </button>
              )}
            </div>
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">{t('sales', 'all_categories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Stats Bar */}
        <div className="alert alert-info d-flex justify-content-between align-items-center mb-4">
          <div>
            <span className="fw-bold">{t('sales', 'total_filtered_sales')}: </span>
            <span className="fs-5 fw-bold text-primary">Rs. {totalSalesAmount.toFixed(2)}</span>
          </div>
          <div className="text-secondary small">
            Showing {sales.length} of {totalSales} Transactions
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top">{t('sales', 'invoice_no')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">{t('common', 'date')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">{t('common', 'customer')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">{t('common', 'amount')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">{t('common', 'payment_method')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">{t('common', 'status')}</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center">{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">{t('common', 'loading')}</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">{t('sales', 'no_sales')}</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="ps-3 border-bottom py-3">
                      <span className="fw-bold text-dark">{sale.invoiceNo}</span>
                    </td>
                    <td className="border-bottom text-secondary">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="border-bottom text-secondary">
                      {sale.customer?.name || t('sales', 'walk_in_customer')}
                    </td>
                    <td className="border-bottom text-dark fw-semibold">
                      {sale.totalRefunded > 0 ? (
                        <div>
                          <span className="text-decoration-line-through text-muted small d-block">
                            Rs. {Number(sale.totalAmount).toFixed(2)}
                          </span>
                          <span className="text-danger fw-bold">
                            Rs. {Number(sale.netAmount !== undefined ? sale.netAmount : (sale.totalAmount - sale.totalRefunded)).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span>Rs. {Number(sale.totalAmount).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="border-bottom">
                      <span className="badge bg-light text-dark border px-2 py-1" style={{ borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                        {sale.paymentMethod || 'CASH'}
                      </span>
                    </td>
                    <td className="border-bottom">
                      {sale.status === 'RETURNED' || sale.returnStatus === 'FULL' ? (
                        <span className="badge bg-danger text-white px-2 py-1" style={{ borderRadius: '4px', fontSize: '11px' }}>
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          {language === 'ne' ? 'फिर्ता (Returned)' : 'Returned'}
                        </span>
                      ) : sale.status === 'PARTIALLY_RETURNED' || sale.returnStatus === 'PARTIAL' ? (
                        <span className="badge bg-warning text-dark px-2 py-1" style={{ borderRadius: '4px', fontSize: '11px' }}>
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          {language === 'ne' ? 'आंशिक फिर्ता' : 'Partially Returned'}
                        </span>
                      ) : (
                        <span className="badge bg-success text-white px-2 py-1" style={{ borderRadius: '4px', fontSize: '11px' }}>
                          {t('common', 'paid')}
                        </span>
                      )}
                    </td>
                    <td className="border-bottom text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button 
                          className="btn btn-outline-primary btn-sm px-3 py-1 fw-semibold" 
                          style={{ borderRadius: '4px' }}
                          onClick={() => handleViewSale(sale)}
                        >
                          <i className="bi bi-eye"></i> {t('common', 'view')}
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
          total={totalSales}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Invoice Modal */}
      <div className="modal fade" id="viewReceiptModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">Invoice Details - {selectedSale?.invoiceNo}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4 bg-light">
              {selectedSale && (
                <div id="printable-receipt-modal" className="bg-white p-4 rounded shadow-sm mx-auto" style={{ maxWidth: '400px', fontSize: '13px' }}>
                  <div className="text-center mb-3">
                    <h5 className="fw-bold mb-1">{storeSettings?.storeName || 'KoseliGhar'}</h5>
                    <p className="mb-0 text-muted small">{storeSettings?.address || 'Main Road, Kathmandu'}</p>
                    <p className="mb-0 text-muted small">Phone: {storeSettings?.phone || 'N/A'}</p>
                    {storeSettings?.vatPanNo && <p className="mb-0 text-muted small">PAN/VAT: {storeSettings.vatPanNo}</p>}
                  </div>

                  <hr className="my-2" />

                  <div className="d-flex justify-content-between mb-1">
                    <span>Invoice #:</span>
                    <span className="fw-bold">{selectedSale.invoiceNo}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Date:</span>
                    <span>{formatDate(selectedSale.createdAt)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Customer:</span>
                    <span>{selectedSale.customer?.name || 'Walk-in Customer'}</span>
                  </div>

                  <hr className="my-2" />

                  <table className="table table-sm border-0 mb-2">
                    <thead>
                      <tr className="border-bottom">
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-end">Price</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item: any, i: number) => (
                        <tr key={i}>
                          <td>{item.product?.name || item.productName || 'Item'}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end">{item.unitPrice?.toFixed(2)}</td>
                          <td className="text-end">{item.total?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <hr className="my-2" />

                  <div className="d-flex justify-content-between mb-1">
                    <span>Subtotal:</span>
                    <span>Rs. {selectedSale.subtotal?.toFixed(2) || selectedSale.totalAmount?.toFixed(2)}</span>
                  </div>
                  {selectedSale.discountAmount > 0 && (
                    <div className="d-flex justify-content-between mb-1 text-danger">
                      <span>Discount:</span>
                      <span>- Rs. {selectedSale.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedSale.taxAmount > 0 && (
                    <div className="d-flex justify-content-between mb-1">
                      <span>VAT / Tax:</span>
                      <span>Rs. {selectedSale.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold fs-6 my-2 border-top border-bottom py-1">
                    <span>Grand Total:</span>
                    <span>Rs. {selectedSale.totalAmount?.toFixed(2)}</span>
                  </div>

                  <div className="text-center mt-3 text-muted small">
                    <p className="mb-0">Thank you for shopping with us!</p>
                    <p className="mb-0">Please visit again</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const modalEl = document.getElementById('viewSaleModal');
                  if (modalEl && (window as any).bootstrap) {
                    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                  }
                  router.push(`/sales-returns?invoiceNo=${encodeURIComponent(selectedSale.invoiceNo)}`);
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i> {language === 'ne' ? 'सामान फिर्ता लिनुहोस्' : 'Return Items'}
              </button>
              <button type="button" className="btn btn-outline-danger" onClick={handleDownloadPDF}>
                <i className="bi bi-file-earmark-pdf me-1"></i> Download PDF
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrintReceipt}>
                <i className="bi bi-printer me-1"></i> Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
