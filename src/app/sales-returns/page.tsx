'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import TableControls from '@/components/TableControls';

interface SaleItemReturnState {
  saleItemId: number;
  productId: number;
  productName: string;
  sku?: string;
  unitPrice: number;
  soldQuantity: number;
  returnQuantity: number;
  taxAmount: number;
}

export default function SalesReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, api } = useAuth();
  const { t, language } = useLanguage();

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);

  // Return Wizard Modal State
  const [showModal, setShowModal] = useState(false);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [matchingSales, setMatchingSales] = useState<any[]>([]);
  const [isSearchingSales, setIsSearchingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<SaleItemReturnState[]>([]);
  const [reason, setReason] = useState('Customer Return');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, currentPage, rowsPerPage]);

  // Check URL query parameters for pre-selected sale/invoice
  useEffect(() => {
    const prefillInvoice = searchParams?.get('invoiceNo') || searchParams?.get('saleId');
    if (prefillInvoice && token) {
      handleDirectInvoiceLookup(prefillInvoice);
    }
  }, [searchParams, token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sales-returns?page=${currentPage}&limit=${rowsPerPage}`);
      setReturns(res.data?.items || res.data || []);
      setTotalReturns(res.data?.total || (Array.isArray(res.data) ? res.data.length : 0));
    } catch (err) {
      console.error('Error fetching sales returns:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search for sales invoices
  useEffect(() => {
    const q = searchInvoice.trim();
    if (!q || q.length < 2) {
      setMatchingSales([]);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setIsSearchingSales(true);
        const res = await api.get(`/sales?search=${encodeURIComponent(q)}&limit=10`);
        const items = res.data?.items || res.data || [];
        setMatchingSales(items);
      } catch (err) {
        console.error('Failed to search sales invoices:', err);
      } finally {
        setIsSearchingSales(false);
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInvoice, api]);

  const handleDirectInvoiceLookup = async (invoiceQuery: string) => {
    try {
      setShowModal(true);
      setIsSearchingSales(true);
      const res = await api.get(`/sales?search=${encodeURIComponent(invoiceQuery)}&limit=5`);
      const items = res.data?.items || res.data || [];
      if (items.length > 0) {
        handleSelectSale(items[0]);
      }
    } catch (err) {
      console.error('Failed direct invoice lookup:', err);
    } finally {
      setIsSearchingSales(false);
    }
  };

  const handleSelectSale = async (sale: any) => {
    try {
      // Fetch full details of the sale including product items
      const res = await api.get(`/sales/${sale.id}`);
      const fullSale = res.data || sale;
      setSelectedSale(fullSale);
      setSearchInvoice(fullSale.invoiceNo);
      setMatchingSales([]);

      // Initialize return items
      const itemsState: SaleItemReturnState[] = (fullSale.items || []).map((item: any) => ({
        saleItemId: item.id,
        productId: item.productId,
        productName: item.product?.name || `Product #${item.productId}`,
        sku: item.product?.SKU,
        unitPrice: item.price || 0,
        soldQuantity: item.quantity || 0,
        returnQuantity: 0, // default 0 so user explicitly enters or checks
        taxAmount: item.taxAmount || 0,
      }));
      setReturnItems(itemsState);
    } catch (err) {
      console.error('Failed to load sale details:', err);
      setSelectedSale(sale);
    }
  };

  const handleReturnQtyChange = (saleItemId: number, newQty: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.saleItemId === saleItemId) {
          const clampedQty = Math.max(0, Math.min(item.soldQuantity, newQty));
          return { ...item, returnQuantity: clampedQty };
        }
        return item;
      }),
    );
  };

  const calculateTotalRefund = () => {
    return returnItems.reduce((sum, item) => {
      const itemPrice = item.unitPrice * item.returnQuantity;
      const itemTax = item.soldQuantity > 0 ? (item.taxAmount / item.soldQuantity) * item.returnQuantity : 0;
      return sum + itemPrice + itemTax;
    }, 0);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) {
      alert(language === 'ne' ? 'कृपया पहिले बिक्री बिल छान्नुहोस्' : 'Please select a sales invoice first');
      return;
    }

    const validItems = returnItems
      .filter((i) => i.returnQuantity > 0)
      .map((i) => ({
        saleItemId: i.saleItemId,
        quantity: i.returnQuantity,
      }));

    if (validItems.length === 0) {
      alert(language === 'ne' ? 'कृपया कम्तिमा एउटा सामानको फिर्ता परिमाण छान्नुहोस्' : 'Please specify return quantity for at least one item');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        saleId: selectedSale.id,
        invoiceNo: selectedSale.invoiceNo,
        reason: reason.trim() || 'Customer Return',
        items: validItems,
      };

      await api.post('/sales-returns', payload);
      alert(language === 'ne' ? 'बिक्री फिर्ता सफलतापूर्वक प्रशोधन गरियो र स्टक थपियो!' : 'Sales return processed successfully and stock restored!');
      setShowModal(false);
      setSelectedSale(null);
      setReturnItems([]);
      setSearchInvoice('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ne' ? 'फिर्ता प्रशोधन गर्दा त्रुटि भयो' : 'Error processing return'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewReturnModal = () => {
    setSelectedSale(null);
    setSearchInvoice('');
    setMatchingSales([]);
    setReturnItems([]);
    setReason('Customer Return');
    setShowModal(true);
  };

  const totalRefundAmount = calculateTotalRefund();
  const totalItemsToReturnCount = returnItems.filter((i) => i.returnQuantity > 0).length;

  return (
    <AuthLayout>
      <div className="container-fluid p-4">
        {/* Header Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title={t('common', 'back')}>
              <i className="bi bi-arrow-left"></i> {t('common', 'back')}
            </button>
            <h3 className="text-dark fw-bold m-0">
              <i className="bi bi-arrow-counterclockwise text-danger me-2"></i>
              {language === 'ne' ? 'बिक्री फिर्ता' : 'Sales Returns'}
            </h3>
          </div>
          <button className="btn btn-danger shadow-sm px-4 fw-bold d-flex align-items-center gap-2" onClick={openNewReturnModal}>
            <i className="bi bi-plus-circle"></i> {language === 'ne' ? 'नयाँ बिक्री फिर्ता' : 'Create Sales Return'}
          </button>
        </div>

        {/* Returns Ledger Table */}
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{language === 'ne' ? 'फिर्ता नं. (Return #)' : 'Return No'}</th>
                  <th>{language === 'ne' ? 'बिक्री बिल नं. (Invoice #)' : 'Invoice No'}</th>
                  <th>{t('common', 'date')}</th>
                  <th>{language === 'ne' ? 'कारण (Reason)' : 'Reason'}</th>
                  <th>{language === 'ne' ? 'कुल फिर्ता रकम' : 'Total Refund'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">{t('common', 'loading')}</td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      <i className="bi bi-receipt-cutoff fs-2 d-block text-secondary mb-2"></i>
                      {language === 'ne' ? 'कुनै बिक्री फिर्ता फेला परेन' : 'No sales returns recorded yet'}
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id}>
                      <td className="fw-bold text-dark">{ret.returnNo}</td>
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1">
                          {ret.sale?.invoiceNo || '-'}
                        </span>
                      </td>
                      <td>
                        <div className="small text-muted">{new Date(ret.returnDate).toLocaleDateString()}</div>
                        <div className="small text-primary fw-semibold">{formatAdToBsFull(new Date(ret.returnDate))}</div>
                      </td>
                      <td>
                        <span className="text-secondary">{ret.reason || 'Customer Return'}</span>
                      </td>
                      <td className="fw-bold text-danger">Rs. {Number(ret.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TableControls
            total={totalReturns}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Smart Return Wizard Modal */}
        {showModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow rounded-4 overflow-hidden">
                <div className="modal-header bg-danger text-white border-bottom-0">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-arrow-counterclockwise"></i>
                    {language === 'ne' ? 'बिक्री फिर्ता फारम' : 'Process Sales Return'}
                  </h5>
                  <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={handleCreateReturn}>
                    {/* Step 1: Invoice Search Bar */}
                    <div className="mb-3 position-relative">
                      <label className="form-label fw-bold text-dark mb-1">
                        1. {language === 'ne' ? 'बिक्री बिल खोज्नुहोस् (बिल नं. वा ग्राहकको नाम/फोन)' : 'Search Sales Invoice (Invoice #, Customer Name, or Phone)'}
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          {isSearchingSales ? (
                            <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                          ) : (
                            <i className="bi bi-search text-muted"></i>
                          )}
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 bg-light"
                          placeholder="Type invoice no (e.g. MLMC-20260821-67034), customer name, or phone..."
                          value={searchInvoice}
                          onChange={(e) => setSearchInvoice(e.target.value)}
                        />
                        {searchInvoice && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={() => {
                              setSearchInvoice('');
                              setSelectedSale(null);
                              setReturnItems([]);
                            }}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>

                      {/* Dropdown search suggestions */}
                      {matchingSales.length > 0 && !selectedSale && (
                        <div
                          className="position-absolute start-0 end-0 bg-white border rounded-3 shadow-lg p-2 mt-1"
                          style={{ zIndex: 1060, maxHeight: '220px', overflowY: 'auto' }}
                        >
                          {matchingSales.map((sale) => (
                            <div
                              key={sale.id}
                              className="p-2.5 rounded cursor-pointer hover-bg-light border-bottom mb-1"
                              onClick={() => handleSelectSale(sale)}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <span className="fw-bold text-primary">{sale.invoiceNo}</span>
                                  <span className="text-muted small ms-2">
                                    ({sale.customer?.name || 'Walk-in Customer'})
                                  </span>
                                </div>
                                <div className="fw-bold text-dark">
                                  Rs. {Number(sale.totalAmount).toFixed(2)}
                                </div>
                              </div>
                              <div className="text-secondary small mt-0.5">
                                {new Date(sale.createdAt).toLocaleString()} | {sale.items?.length || 0} items
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Selected Invoice Banner */}
                    {selectedSale && (
                      <div className="card bg-light border-0 rounded-3 p-3 mb-3">
                        <div className="row g-2 align-items-center">
                          <div className="col-12 col-md-4">
                            <span className="text-muted small d-block">Invoice Number:</span>
                            <strong className="text-primary fs-6">{selectedSale.invoiceNo}</strong>
                          </div>
                          <div className="col-12 col-md-4">
                            <span className="text-muted small d-block">Customer:</span>
                            <strong className="text-dark">{selectedSale.customer?.name || 'Walk-in Customer'}</strong>
                          </div>
                          <div className="col-12 col-md-4 text-md-end">
                            <span className="text-muted small d-block">Original Bill Total:</span>
                            <strong className="text-success fs-6">Rs. {Number(selectedSale.totalAmount).toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Sold Items Return Selection Table */}
                    {selectedSale && (
                      <div className="mb-3">
                        <label className="form-label fw-bold text-dark mb-1">
                          2. {language === 'ne' ? 'फिर्ता हुने सामान र परिमाण छान्नुहोस्' : 'Select Returned Items & Quantities'}
                        </label>
                        <div className="table-responsive border rounded-3">
                          <table className="table table-sm align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Product</th>
                                <th className="text-center">Sold Qty</th>
                                <th className="text-end">Unit Price</th>
                                <th className="text-center" style={{ width: '150px' }}>Return Qty</th>
                                <th className="text-end">Refund Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {returnItems.map((item) => {
                                const itemRefund = item.unitPrice * item.returnQuantity;
                                const isReturning = item.returnQuantity > 0;
                                return (
                                  <tr key={item.saleItemId} className={isReturning ? 'table-warning' : ''}>
                                    <td>
                                      <div className="fw-semibold text-dark">{item.productName}</div>
                                      {item.sku && <small className="text-muted">SKU: {item.sku}</small>}
                                    </td>
                                    <td className="text-center fw-semibold text-secondary">
                                      {item.soldQuantity}
                                    </td>
                                    <td className="text-end text-dark">
                                      Rs. {item.unitPrice.toFixed(2)}
                                    </td>
                                    <td>
                                      <div className="input-group input-group-sm justify-content-center">
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary"
                                          onClick={() => handleReturnQtyChange(item.saleItemId, item.returnQuantity - 1)}
                                          disabled={item.returnQuantity <= 0}
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          className="form-control text-center"
                                          style={{ maxWidth: '60px' }}
                                          min="0"
                                          max={item.soldQuantity}
                                          value={item.returnQuantity}
                                          onChange={(e) => handleReturnQtyChange(item.saleItemId, parseFloat(e.target.value) || 0)}
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary"
                                          onClick={() => handleReturnQtyChange(item.saleItemId, item.returnQuantity + 1)}
                                          disabled={item.returnQuantity >= item.soldQuantity}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>
                                    <td className="text-end fw-bold text-danger">
                                      Rs. {itemRefund.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Reason & Refund Summary */}
                    {selectedSale && (
                      <div className="row g-3 align-items-end mb-4">
                        <div className="col-12 col-md-7">
                          <label className="form-label fw-bold text-dark mb-1">
                            3. {language === 'ne' ? 'फिर्ताको कारण (Reason)' : 'Return Reason'}
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Defective item, wrong purchase, customer exchange..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-12 col-md-5">
                          <div className="card bg-danger-subtle border-danger border p-2 text-center rounded-3">
                            <span className="text-danger small fw-semibold">Total Refund to Customer:</span>
                            <span className="fs-5 fw-bold text-danger">
                              Rs. {totalRefundAmount.toFixed(2)}
                            </span>
                            <span className="text-muted small">
                              ({totalItemsToReturnCount} item(s) selected)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Modal Actions */}
                    <div className="text-end border-top pt-3">
                      <button
                        type="button"
                        className="btn btn-light rounded-pill px-4 me-2 fw-semibold"
                        onClick={() => setShowModal(false)}
                      >
                        {t('common', 'cancel')}
                      </button>
                      <button
                        type="submit"
                        className="btn btn-danger rounded-pill px-4 fw-bold"
                        disabled={isSubmitting || !selectedSale || totalItemsToReturnCount === 0}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-circle me-1"></i>
                            {language === 'ne' ? 'फिर्ता सम्पन्न गर्नुहोस्' : 'Process Return'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
