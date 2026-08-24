'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import TableControls from '@/components/TableControls';
import CustomNotificationModal, { NotificationState } from '@/components/CustomNotificationModal';

interface PurchaseItemReturnState {
  purchaseItemId: number;
  productId: number;
  productName: string;
  sku?: string;
  costPrice: number;
  purchasedQuantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  returnQuantity: number;
  currentStock: number;
}

export default function PurchaseReturnsPage() {
  const router = useRouter();
  const { token, api } = useAuth();
  const { t, language } = useLanguage();

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);

  // Custom Modal Notification State
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Return Wizard Modal State
  const [showModal, setShowModal] = useState(false);
  const [searchPO, setSearchPO] = useState('');
  const [matchingPurchases, setMatchingPurchases] = useState<any[]>([]);
  const [isSearchingPurchases, setIsSearchingPurchases] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<PurchaseItemReturnState[]>([]);
  const [reason, setReason] = useState('Purchase Return / Damaged Goods');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, currentPage, rowsPerPage]);

  // Check URL query parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && token) {
      const params = new URLSearchParams(window.location.search);
      const prefillPO = params.get('poNumber') || params.get('purchaseId');
      if (prefillPO) {
        handleDirectPOLookup(prefillPO);
      }
    }
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/purchase-returns?page=${currentPage}&limit=${rowsPerPage}`);
      setReturns(res.data?.items || res.data || []);
      setTotalReturns(res.data?.total || (Array.isArray(res.data) ? res.data.length : 0));
    } catch (err) {
      console.error('Error fetching purchase returns:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search for purchase orders
  useEffect(() => {
    const q = searchPO.trim();
    if (!q || q.length < 2) {
      setMatchingPurchases([]);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setIsSearchingPurchases(true);
        const res = await api.get(`/purchases?search=${encodeURIComponent(q)}&limit=10`);
        const items = res.data?.items || res.data || [];
        setMatchingPurchases(items);
      } catch (err) {
        console.error('Failed to search purchases:', err);
      } finally {
        setIsSearchingPurchases(false);
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchPO, api]);

  const handleDirectPOLookup = async (poQuery: string) => {
    try {
      setShowModal(true);
      setIsSearchingPurchases(true);
      const res = await api.get(`/purchases?search=${encodeURIComponent(poQuery)}&limit=5`);
      const items = res.data?.items || res.data || [];
      if (items.length > 0) {
        handleSelectPurchase(items[0]);
      }
    } catch (err) {
      console.error('Failed direct PO lookup:', err);
    } finally {
      setIsSearchingPurchases(false);
    }
  };

  const mapPurchaseItems = (rawPurchase: any): PurchaseItemReturnState[] => {
    return (rawPurchase?.items || []).map((item: any) => {
      const purQty = item.quantity || 0;
      const retQty = item.returnedQuantity !== undefined ? item.returnedQuantity : 0;
      const remQty = item.remainingQuantity !== undefined ? item.remainingQuantity : Math.max(0, purQty - retQty);
      const currentStock = item.product?.stock !== undefined ? item.product.stock : purQty;

      return {
        purchaseItemId: item.id,
        productId: item.productId,
        productName: item.product?.name || `Product #${item.productId}`,
        sku: item.product?.SKU,
        costPrice: item.costPrice || item.unitPrice || 0,
        purchasedQuantity: purQty,
        returnedQuantity: retQty,
        remainingQuantity: remQty,
        returnQuantity: 0,
        currentStock,
      };
    });
  };

  const handleSelectPurchase = async (purchase: any) => {
    // 1. Immediately populate from searched purchase so items table is never empty
    setSelectedPurchase(purchase);
    setSearchPO(purchase.poNumber);
    setMatchingPurchases([]);
    if (purchase.items && purchase.items.length > 0) {
      setReturnItems(mapPurchaseItems(purchase));
    }

    // 2. Fetch enriched details from backend
    try {
      const res = await api.get(`/purchases/${purchase.id}`);
      const fullPurchase = res.data || purchase;
      setSelectedPurchase(fullPurchase);
      if (fullPurchase.items && fullPurchase.items.length > 0) {
        setReturnItems(mapPurchaseItems(fullPurchase));
      }
    } catch (err) {
      console.error('Failed to load purchase details:', err);
    }
  };

  const handleReturnQtyChange = (purchaseItemId: number, newQty: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.purchaseItemId === purchaseItemId) {
          const maxAllowed = Math.min(item.remainingQuantity, item.currentStock);
          const clampedQty = Math.max(0, Math.min(maxAllowed, newQty));
          return { ...item, returnQuantity: clampedQty };
        }
        return item;
      }),
    );
  };

  const calculateTotalRefund = () => {
    return returnItems.reduce((sum, item) => {
      return sum + item.costPrice * item.returnQuantity;
    }, 0);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) {
      setNotification({
        show: true,
        type: 'warning',
        title: language === 'ne' ? 'खरिद बिल छानिएको छैन' : 'No Purchase Selected',
        message: language === 'ne' ? 'कृपया पहिले खरिद बिल छान्नुहोस्' : 'Please select a purchase order first',
      });
      return;
    }

    const validItems = returnItems
      .filter((i) => i.returnQuantity > 0)
      .map((i) => ({
        purchaseItemId: i.purchaseItemId,
        quantity: i.returnQuantity,
      }));

    if (validItems.length === 0) {
      setNotification({
        show: true,
        type: 'warning',
        title: language === 'ne' ? 'परिमाण छानिएको छैन' : 'No Items Selected',
        message: language === 'ne' ? 'कृपया कम्तिमा एउटा सामानको फिर्ता परिमाण छान्नुहोस्' : 'Please specify return quantity for at least one item',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        purchaseId: selectedPurchase.id,
        poNumber: selectedPurchase.poNumber,
        reason: reason.trim() || 'Purchase Return',
        items: validItems,
      };

      await api.post('/purchase-returns', payload);
      setShowModal(false);
      setSelectedPurchase(null);
      setReturnItems([]);
      setSearchPO('');
      loadData();

      setNotification({
        show: true,
        type: 'success',
        title: language === 'ne' ? 'खरिद फिर्ता सम्पन्न!' : 'Purchase Return Processed!',
        message: language === 'ne' ? 'खरिद फिर्ता सफलतापूर्वक प्रशोधन गरियो र स्टक घटाइयो!' : 'Purchase return processed successfully and stock deducted!',
      });
    } catch (err: any) {
      setNotification({
        show: true,
        type: 'error',
        title: language === 'ne' ? 'त्रुटि (Error)' : 'Process Failed',
        message: err.response?.data?.message || (language === 'ne' ? 'खरिद फिर्ता गर्दा त्रुटि भयो' : 'Error processing purchase return'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewReturnModal = () => {
    setSelectedPurchase(null);
    setSearchPO('');
    setMatchingPurchases([]);
    setReturnItems([]);
    setReason('Purchase Return / Damaged Goods');
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
              <i className="bi bi-cart-x text-danger me-2"></i>
              {language === 'ne' ? 'खरिद फिर्ता' : 'Purchase Returns'}
            </h3>
          </div>
          <button className="btn btn-danger shadow-sm px-4 fw-bold d-flex align-items-center gap-2" onClick={openNewReturnModal}>
            <i className="bi bi-plus-circle"></i> {language === 'ne' ? 'नयाँ खरिद फिर्ता' : 'Create Purchase Return'}
          </button>
        </div>

        {/* Returns Table */}
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{language === 'ne' ? 'फिर्ता नं. (Return #)' : 'Return No'}</th>
                  <th>{language === 'ne' ? 'खरिद PO नं. (PO #)' : 'PO Number'}</th>
                  <th>{language === 'ne' ? 'आपूर्तिकर्ता (Supplier)' : 'Supplier'}</th>
                  <th>{t('common', 'date')}</th>
                  <th>{language === 'ne' ? 'कारण (Reason)' : 'Reason'}</th>
                  <th>{language === 'ne' ? 'कुल फिर्ता रकम' : 'Total Refund'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">{t('common', 'loading')}</td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <i className="bi bi-cart-x fs-2 d-block text-secondary mb-2"></i>
                      {language === 'ne' ? 'कुनै खरिद फिर्ता फेला परेन' : 'No purchase returns recorded yet'}
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id}>
                      <td className="fw-bold text-dark">{ret.returnNo}</td>
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1">
                          {ret.purchase?.poNumber || '-'}
                        </span>
                      </td>
                      <td className="fw-semibold text-secondary">{ret.supplier?.name || '-'}</td>
                      <td>
                        <div className="small text-muted">{new Date(ret.returnDate).toLocaleDateString()}</div>
                        <div className="small text-primary fw-semibold">{formatAdToBsFull(new Date(ret.returnDate))}</div>
                      </td>
                      <td>
                        <span className="text-secondary">{ret.reason || 'Purchase Return'}</span>
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

        {/* Smart Purchase Return Wizard Modal */}
        {showModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow rounded-4 overflow-hidden">
                <div className="modal-header bg-danger text-white border-bottom-0">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-cart-x"></i>
                    {language === 'ne' ? 'खरिद फिर्ता फारम' : 'Process Purchase Return'}
                  </h5>
                  <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={handleCreateReturn}>
                    {/* Step 1: PO Search */}
                    <div className="mb-3 position-relative">
                      <label className="form-label fw-bold text-dark mb-1">
                        1. {language === 'ne' ? 'खरिद बिल खोज्नुहोस् (PO नं. वा आपूर्तिकर्ता)' : 'Search Purchase Order (PO #, Supplier, or Product)'}
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          {isSearchingPurchases ? (
                            <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                          ) : (
                            <i className="bi bi-search text-muted"></i>
                          )}
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 bg-light"
                          placeholder="Type PO # (e.g. PUR-856391663), supplier name..."
                          value={searchPO}
                          onChange={(e) => setSearchPO(e.target.value)}
                        />
                        {searchPO && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={() => {
                              setSearchPO('');
                              setSelectedPurchase(null);
                              setReturnItems([]);
                            }}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>

                      {/* Dropdown search suggestions */}
                      {matchingPurchases.length > 0 && !selectedPurchase && (
                        <div
                          className="position-absolute start-0 end-0 bg-white border rounded-3 shadow-lg p-2 mt-1"
                          style={{ zIndex: 1060, maxHeight: '220px', overflowY: 'auto' }}
                        >
                          {matchingPurchases.map((pur) => (
                            <div
                              key={pur.id}
                              className="p-2.5 rounded cursor-pointer hover-bg-light border-bottom mb-1"
                              onClick={() => handleSelectPurchase(pur)}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <span className="fw-bold text-primary">{pur.poNumber}</span>
                                  <span className="text-muted small ms-2">
                                    (Supplier: {pur.supplier?.name || 'N/A'})
                                  </span>
                                </div>
                                <div className="fw-bold text-dark">
                                  Rs. {Number(pur.totalAmount).toFixed(2)}
                                </div>
                              </div>
                              <div className="text-secondary small mt-0.5">
                                {new Date(pur.createdAt).toLocaleString()} | {pur.items?.length || 0} items
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Selected Purchase Banner */}
                    {selectedPurchase && (
                      <div className="card bg-light border-0 rounded-3 p-3 mb-3">
                        <div className="row g-2 align-items-center">
                          <div className="col-12 col-md-4">
                            <span className="text-muted small d-block">PO Number:</span>
                            <strong className="text-primary fs-6">{selectedPurchase.poNumber}</strong>
                          </div>
                          <div className="col-12 col-md-4">
                            <span className="text-muted small d-block">Supplier:</span>
                            <strong className="text-dark">{selectedPurchase.supplier?.name || 'N/A'}</strong>
                          </div>
                          <div className="col-12 col-md-4 text-md-end">
                            <span className="text-muted small d-block">Original PO Total:</span>
                            <strong className="text-success fs-6">Rs. {Number(selectedPurchase.totalAmount).toFixed(2)}</strong>
                          </div>
                        </div>

                        {/* Already Returned Alert Banner */}
                        {(selectedPurchase.status === 'RETURNED' || selectedPurchase.returnStatus === 'FULL' || returnItems.every((i) => i.remainingQuantity === 0)) ? (
                          <div className="alert alert-danger d-flex align-items-center gap-2 mb-0 mt-3 py-2 px-3 rounded-3">
                            <i className="bi bi-exclamation-octagon-fill fs-5 text-danger"></i>
                            <div>
                              <strong>{language === 'ne' ? 'यो खरिद बिल पहिल्यै पूर्ण रूपमा फिर्ता भइसकेको छ!' : 'This purchase is already fully returned!'}</strong>
                              <div className="small text-muted">{language === 'ne' ? 'सबै सामान फिर्ता भइसकेको हुनाले थप फिर्ता गर्न मिल्दैन।' : 'All items from this purchase order have already been returned. No further returns allowed.'}</div>
                            </div>
                          </div>
                        ) : selectedPurchase.totalRefunded > 0 ? (
                          <div className="alert alert-warning d-flex align-items-center gap-2 mb-0 mt-3 py-2 px-3 rounded-3">
                            <i className="bi bi-info-circle-fill fs-5 text-warning"></i>
                            <div>
                              <strong>{language === 'ne' ? 'आंशिक फिर्ता भएको खरिद बिल (Partially Returned Purchase)' : 'Partially Returned Purchase'}</strong>
                              <div className="small text-muted">
                                {language === 'ne' ? `पहिले फिर्ता भएको रकम: Rs. ${selectedPurchase.totalRefunded.toFixed(2)}` : `Previously refunded amount: Rs. ${selectedPurchase.totalRefunded.toFixed(2)}`}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Step 3: Purchased Items Return Selection Table */}
                    {selectedPurchase && (
                      <div className="mb-3">
                        <label className="form-label fw-bold text-dark mb-1">
                          2. {language === 'ne' ? 'आपूर्तिकर्तालाई फिर्ता गर्ने सामान र परिमाण छान्नुहोस्' : 'Select Items & Quantities to Return'}
                        </label>
                        <div className="table-responsive border rounded-3">
                          <table className="table table-sm align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Product</th>
                                <th className="text-center">Purchased</th>
                                <th className="text-center">Returned</th>
                                <th className="text-center">Stock</th>
                                <th className="text-end">Cost Price</th>
                                <th className="text-center" style={{ width: '140px' }}>Return Qty</th>
                                <th className="text-end">Refund Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {returnItems.map((item) => {
                                const itemRefund = item.costPrice * item.returnQuantity;
                                const isReturning = item.returnQuantity > 0;
                                const maxReturnable = Math.min(item.remainingQuantity, item.currentStock);
                                const isFullyReturned = item.remainingQuantity === 0;

                                return (
                                  <tr key={item.purchaseItemId} className={isReturning ? 'table-warning' : isFullyReturned ? 'table-light' : ''}>
                                    <td>
                                      <div className="fw-semibold text-dark">{item.productName}</div>
                                      {item.sku && <small className="text-muted">SKU: {item.sku}</small>}
                                    </td>
                                    <td className="text-center fw-semibold text-secondary">
                                      {item.purchasedQuantity}
                                    </td>
                                    <td className="text-center text-danger fw-semibold">
                                      {item.returnedQuantity}
                                    </td>
                                    <td className="text-center fw-bold text-success">
                                      {item.currentStock}
                                    </td>
                                    <td className="text-end text-dark">
                                      Rs. {item.costPrice.toFixed(2)}
                                    </td>
                                    <td>
                                      {isFullyReturned ? (
                                        <span className="badge bg-secondary w-100 py-1.5">
                                          {language === 'ne' ? 'फिर्ता भइसक्यो' : 'Returned'}
                                        </span>
                                      ) : maxReturnable <= 0 ? (
                                        <span className="badge bg-warning-subtle text-warning-emphasis w-100 py-1.5" title="No available stock">
                                          Out of Stock
                                        </span>
                                      ) : (
                                        <div className="input-group input-group-sm justify-content-center">
                                          <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => handleReturnQtyChange(item.purchaseItemId, item.returnQuantity - 1)}
                                            disabled={item.returnQuantity <= 0}
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            className="form-control text-center"
                                            style={{ maxWidth: '50px' }}
                                            min="0"
                                            max={maxReturnable}
                                            value={item.returnQuantity}
                                            onChange={(e) => handleReturnQtyChange(item.purchaseItemId, parseFloat(e.target.value) || 0)}
                                          />
                                          <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => handleReturnQtyChange(item.purchaseItemId, item.returnQuantity + 1)}
                                            disabled={item.returnQuantity >= maxReturnable}
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
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
                    {selectedPurchase && (
                      <div className="row g-3 align-items-end mb-4">
                        <div className="col-12 col-md-7">
                          <label className="form-label fw-bold text-dark mb-1">
                            3. {language === 'ne' ? 'फिर्ताको कारण (Reason)' : 'Return Reason'}
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Damaged goods, expired, over-delivered, defect..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-12 col-md-5">
                          <div className="card bg-danger-subtle border-danger border p-2 text-center rounded-3">
                            <span className="text-danger small fw-semibold">Total Refund from Supplier:</span>
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
                        disabled={isSubmitting || !selectedPurchase || totalItemsToReturnCount === 0}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-circle me-1"></i>
                            {language === 'ne' ? 'खरिद फिर्ता सम्पन्न गर्नुहोस्' : 'Process Purchase Return'}
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

        {/* Custom Notification Modal */}
        <CustomNotificationModal
          notification={notification}
          onClose={() => setNotification(null)}
        />
      </div>
    </AuthLayout>
  );
}
