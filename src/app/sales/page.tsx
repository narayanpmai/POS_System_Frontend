'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import * as XLSX from 'xlsx';

export default function SalesHistoryPage() {
  const { token, api, activeFiscalYear, user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // For the invoice modal
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, activeFiscalYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, settingsRes] = await Promise.all([
        api.get('/sales'),
        api.get('/settings').catch(() => ({ data: null }))
      ]);
      setSales(salesRes.data.items || []);
      if (settingsRes.data) {
        setStoreSettings(settingsRes.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

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
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!selectedSale) return;

    const element = document.getElementById('printable-receipt-modal');
    if (!element) return;

    try {
      // Dynamic import to prevent SSR Node server crash
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin:       [6, 6, 6, 6] as [number, number, number, number],
        filename:     `Invoice-${selectedSale.invoiceNo || 'INV'}.pdf`,
        image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 3, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm' as 'mm', format: 'a6' as 'a6', orientation: 'portrait' as 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF file.');
    }
  };

  const handleDeleteSale = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sale and restore stock?')) return;
    try {
      await api.delete(`/sales/${id}`);
      alert('Sale deleted successfully');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting sale');
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sales.map(s => ({
      'Invoice No': s.invoiceNo,
      Date: formatDate(s.createdAt),
      Customer: s.customer?.name || 'Walk-in Customer',
      Amount: s.totalAmount,
      Payment: s.paymentStatus,
      Status: 'Completed'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, "Sales_History.xlsx");
  };

  return (
    <AuthLayout>
      <div className="card border-0 rounded-md shadow-sm p-4" style={{ backgroundColor: 'var(--light-card)' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h4 className="fw-bold m-0 text-dark">Sales History</h4>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-success fw-semibold d-flex align-items-center gap-2 px-3 py-2" 
              style={{ borderRadius: '8px' }} 
              onClick={handleExportExcel}
            >
              <i className="bi bi-file-earmark-excel"></i> Export
            </button>
            <Link href="/pos" className="text-decoration-none">
              <button className="btn btn-primary fw-semibold d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#0d6efd', borderRadius: '8px' }}>
                <i className="bi bi-display"></i> POS Screen
              </button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top">Invoice ID</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Date</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Customer</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Amount</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Payment</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Status</th>
                <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">Loading sales history...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">No sales found</td>
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
                      {sale.customer?.name || 'Walk-in Customer'}
                    </td>
                    <td className="border-bottom text-dark fw-semibold">
                      Rs.{sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="border-bottom">
                      <span className="badge bg-success text-white px-2 py-1" style={{ borderRadius: '4px', fontSize: '11px', textTransform: 'capitalize' }}>
                        {sale.paymentStatus.toLowerCase()}
                      </span>
                    </td>
                    <td className="border-bottom">
                      <span className="badge bg-success text-white px-2 py-1" style={{ borderRadius: '4px', fontSize: '11px' }}>
                        Completed
                      </span>
                    </td>
                    <td className="border-bottom text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button 
                          className="btn btn-outline-primary btn-sm px-3 py-1 fw-semibold" 
                          style={{ borderRadius: '4px' }}
                          onClick={() => handleViewSale(sale)}
                        >
                          <i className="bi bi-eye"></i> View
                        </button>
                        {user?.role?.name === 'Admin' && (
                          <button 
                            className="btn btn-outline-danger btn-sm px-3 py-1 fw-semibold" 
                            style={{ borderRadius: '4px' }}
                            onClick={() => handleDeleteSale(sale.id)}
                            title="Delete Sale & Restore Stock"
                          >
                            <i className="bi bi-trash-fill"></i> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                <i className="bi bi-receipt me-2 text-warning"></i>Invoice Details
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-3">
              
              {/* Receipt formatting for window.print() and PDF export */}
              <div id="printable-receipt-modal" className="thermal-receipt mx-auto">
                <div className="text-center">
                  <h5 className="m-0 fw-bold" style={{ fontFamily: 'Outfit' }}>
                    {storeSettings?.storeName || 'PANCHPOKHARI KOSELI GHAR'}
                  </h5>
                  <p className="m-0 text-muted" style={{ fontSize: '10px' }}>
                    {storeSettings?.address || '123 Retail Plaza'}<br />
                    Tel: {storeSettings?.phone || '+1 555-0100'}<br />
                    TAX No: {storeSettings?.taxNumber || 'TAX-VAT-8292'}<br />
                    Cashier: {selectedSale?.cashier?.name || 'Cashier'}
                  </p>
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                <div style={{ fontSize: '10px' }}>
                  <strong>Invoice:</strong> {selectedSale?.invoiceNo || 'INV-00000'}<br />
                  <strong>Date:</strong> {selectedSale ? formatAdToBsFull(selectedSale.createdAt) : ''}<br />
                  <strong>Customer:</strong> {selectedSale?.customer?.name || 'Walk-In Customer'}
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                {/* Items layout */}
                <table className="w-100 font-mono" style={{ fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #666' }}>
                      <th align="left">Item</th>
                      <th align="center">Qty</th>
                      <th align="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale?.items?.map((item: any, idx: number) => (
                      <tr key={idx} style={{ verticalAlign: 'top' }}>
                        <td>{item.product?.name}</td>
                        <td align="center">x{item.quantity}</td>
                        <td align="right">Rs. {Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                <div className="font-mono" style={{ fontSize: '11px' }}>
                  <div className="d-flex justify-content-between">
                    <span>Subtotal:</span>
                    <span>Rs. {Number(selectedSale?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Tax:</span>
                    <span>Rs. {Number(selectedSale?.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  {Number(selectedSale?.discountAmount) > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Discount:</span>
                      <span>-Rs. {Number(selectedSale?.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold border-top pt-1 mt-1 fs-6">
                    <span>TOTAL PAID:</span>
                    <span>Rs. {Number(selectedSale?.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                {/* QR Code and customer points */}
                <div className="text-center font-mono" style={{ fontSize: '10px' }}>
                  {selectedSale?.customer && (
                    <div className="mb-2">
                      <strong>Loyalty points earned:</strong> +{Math.floor(Number(selectedSale?.totalAmount) / 10)} pts<br />
                    </div>
                  )}
                  
                  {/* Virtual receipt QR Code representation */}
                  <div className="d-inline-block p-2 bg-light border mb-2 mt-2">
                    <i className="bi bi-qr-code fs-1 text-dark"></i>
                  </div>
                  <p className="m-0 text-muted">{storeSettings?.receiptFooter || 'Thank you!'}</p>
                </div>
              </div>

            </div>
            <div className="modal-footer border-top p-3 no-print d-flex flex-nowrap justify-content-end gap-2">
              <button type="button" className="btn btn-light btn-sm rounded-md border" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-outline-primary btn-sm rounded-md d-flex align-items-center gap-1" onClick={handleDownloadPDF}>
                <i className="bi bi-file-earmark-pdf-fill"></i> PDF
              </button>
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
