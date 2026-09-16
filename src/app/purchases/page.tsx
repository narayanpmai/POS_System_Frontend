'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import BSDatePicker from '@/components/BSDatePicker';
import TableControls, { applyPagination } from '@/components/TableControls';
import SearchableProductSelect from '@/components/SearchableProductSelect';
import { useCustomAlert } from '@/context/CustomAlertContext';
import {
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
} from '@/redux/api/purchasesApi';
import * as XLSX from 'xlsx';

export default function PurchasesPage() {
  const router = useRouter();
  const { token, user, api, activeFiscalYear } = useAuth();
  const { t, language } = useLanguage();
  const { showAlert } = useCustomAlert();
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [auxLoading, setAuxLoading] = useState(true);
  const [cartRowsPerPage, setCartRowsPerPage] = useState(10);
  const [listRowsPerPage, setListRowsPerPage] = useState(10);
  const [cartCurrentPage, setCartCurrentPage] = useState(1);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // RTK Query for Purchases with automatic cache busting on mount & window focus
  const { data: purchaseData, isFetching: loading, refetch } = useGetPurchasesQuery(
    {
      page: listCurrentPage,
      limit: listRowsPerPage,
      search: searchTerm,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  const [createPurchase] = useCreatePurchaseMutation();
  const [updatePurchase] = useUpdatePurchaseMutation();

  const purchases: any[] = purchaseData?.items || [];
  const totalPurchases = purchaseData?.total || 0;

  // New Purchase Form UI state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);

  // Form State
  const [referenceNo, setReferenceNo] = useState(`PUR-${Math.floor(Math.random() * 1000000000)}`);
  const [note, setNote] = useState('');
  const [supplier, setSupplier] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxPercentInput, setTaxPercentInput] = useState<string>('0');
  const [overallDiscPercent, setOverallDiscPercent] = useState<number>(0);
  const [overallDiscPercentInput, setOverallDiscPercentInput] = useState<string>('0');

  // View modal state
  const [viewPurchase, setViewPurchase] = useState<any | null>(null);

  useEffect(() => {
    if (!token) return;
    loadAuxData();
  }, [token, activeFiscalYear]);

  const loadAuxData = async () => {
    setAuxLoading(true);
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        api.get('/products?limit=1000'),
        api.get('/suppliers')
      ]);
      const prods = Array.isArray(productsRes.data)
        ? productsRes.data
        : (productsRes.data?.items || productsRes.data?.data || []);
      const sups = Array.isArray(suppliersRes.data)
        ? suppliersRes.data
        : (suppliersRes.data?.items || suppliersRes.data?.data || []);
      setProducts(prods);
      setSuppliers(sups);
    } catch (err) {
      console.error(err);
    }
    setAuxLoading(false);
  };

  const exportToExcel = () => {
    if (!purchases || purchases.length === 0) {
      showAlert({
        title: language === 'ne' ? 'डाटा छैन' : 'No Data',
        message: language === 'ne' ? 'एक्सपोर्ट गर्नका लागि कुनै खरिद रेकर्ड छैन।' : 'No purchase records available to export.',
        type: 'warning',
      });
      return;
    }

    const dataToExport = purchases.map((p, index) => {
      const itemsSummary = (p.items || [])
        .map((item: any) => {
          const prodName = products.find((prod) => prod.id === item.productId)?.name || `Product #${item.productId}`;
          return `${prodName} (x${item.quantity} ${item.measurementUnit || 'pcs'} @ Rs.${(item.costPrice || item.unitPrice || 0).toFixed(2)})`;
        })
        .join('; ');

      return {
        'S.N.': index + 1,
        'PO Number': p.poNumber,
        'Purchase Date (BS)': formatAdToBs(p.purchaseDate),
        'Supplier': p.supplier?.name || 'Cash Supplier',
        'Products': itemsSummary || 'No items',
        'Total Amount (Rs.)': Number(p.totalAmount || 0).toFixed(2),
        'Refunded Amount (Rs.)': Number(p.totalRefunded || 0).toFixed(2),
        'Net Amount (Rs.)': Number(p.netAmount !== undefined ? p.netAmount : (p.totalAmount - (p.totalRefunded || 0))).toFixed(2),
        'Status': p.status || 'COMPLETED',
        'Payment Status': p.paymentStatus || 'PAID',
        'Created By': p.user?.name || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases');
    XLSX.writeFile(workbook, `Purchases_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAddItem = () => {
    setCart([...cart, { 
      productId: '', 
      unitPrice: 0,
      unitPriceInput: '0',
      unit: 'pcs',
      qty: 1,
      qtyInput: '1',
      discPercent: 0,
      discPercentInput: '0',
    }]);
  };

  const handleSelectProduct = (idx: number, product: any | null) => {
    const newCart = [...cart];
    if (!product) {
      newCart[idx].productId = '';
      newCart[idx].unitPrice = 0;
      newCart[idx].unitPriceInput = '0';
    } else {
      newCart[idx].productId = String(product.id);
      newCart[idx].unitPrice = product.cost || 0;
      newCart[idx].unitPriceInput = String(product.cost || 0);
      newCart[idx].unit = product.unit || 'pcs';
    }
    setCart(newCart);
  };

  const updateCartItem = (idx: number, field: string, value: any) => {
    const newCart = [...cart];
    newCart[idx][field] = value;

    if (field === 'productId' && value) {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) {
        newCart[idx].unitPrice = prod.cost || 0;
        newCart[idx].unit = prod.unit || 'pcs';
      }
    }

    setCart(newCart);
  };

  const removeCartItem = (idx: number) => {
    const newCart = [...cart];
    newCart.splice(idx, 1);
    setCart(newCart);
  };

  // Calculations
  const calculateTotals = () => {
    let itemSubtotal = 0;
    cart.forEach(item => {
      const sub = (item.unitPrice || 0) * (item.qty || 1);
      const disc = sub * ((item.discPercent || 0) / 100);
      itemSubtotal += (sub - disc);
    });

    const overallDisc = itemSubtotal * ((overallDiscPercent || 0) / 100);
    const afterDisc = itemSubtotal - overallDisc;
    const taxAmt = afterDisc * ((taxPercent || 0) / 100);
    const grandTotal = afterDisc + taxAmt;

    return { itemSubtotal, overallDisc, taxAmt, grandTotal };
  };

  const totals = calculateTotals();

  const submitPurchase = async () => {
    const validCart = cart.filter(c => c.productId && c.qty > 0);
    if (validCart.length === 0) {
      showAlert("Please add at least one valid item.", "Validation Error", "warning");
      return;
    }
    
    const mappedItems = validCart.map(c => ({
      productId: parseInt(c.productId),
      quantity: c.qty,
      costPrice: c.unitPrice,
      measurementUnit: c.unit || 'pcs',
    }));

    const originalDate = isEditing && editingPurchaseId
      ? purchases.find(p => p.id === editingPurchaseId)?.purchaseDate
      : null;

    const payload = {
      poNumber: referenceNo,
      supplierId: supplier ? parseInt(supplier) : null,
      purchaseDate: originalDate || new Date().toISOString(),
      totalAmount: totals.grandTotal,
      items: mappedItems
    };

    try {
      if (isEditing && editingPurchaseId) {
        await updatePurchase({ id: editingPurchaseId, data: payload }).unwrap();
        showAlert(t('common', 'updated_successfully') || 'Purchase Order updated successfully!', 'Success', 'success');
      } else {
        await createPurchase(payload).unwrap();
        showAlert(t('common', 'saved_successfully') || 'Purchase Order created successfully!', 'Success', 'success');
      }

      closeForm();
    } catch (err: any) {
      showAlert(err?.data?.message || err?.message || t('common', 'error'), 'Purchase Error', 'error');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingPurchaseId(null);
    setCart([]);
    setReferenceNo(`PUR-${Math.floor(Math.random() * 1000000000)}`);
    setTaxPercent(0);
    setTaxPercentInput('0');
    setOverallDiscPercent(0);
    setOverallDiscPercentInput('0');
    setSupplier('');
    setNote('');
  };

  const handleEdit = (purchase: any) => {
    setIsEditing(true);
    setEditingPurchaseId(purchase.id);
    setReferenceNo(purchase.poNumber);
    setSupplier(purchase.supplierId ? purchase.supplierId.toString() : '');
    if (purchase.items && purchase.items.length > 0) {
      const existingCart = purchase.items.map((item: any) => ({
        productId: item.productId.toString(),
        unitPrice: item.costPrice,
        unitPriceInput: String(item.costPrice ?? 0),
        unit: item.measurementUnit || 'pcs',
        qty: item.quantity,
        qtyInput: String(item.quantity ?? 1),
        discPercent: 0,
        discPercentInput: '0',
      }));
      setCart(existingCart);
    } else {
      setCart([]);
    }
    setShowForm(true);
  };

  if (showForm) {
    return (
      <AuthLayout>
        <div className="card p-4 border-0 shadow-sm" style={{ backgroundColor: 'var(--light-card)', overflow: 'visible' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold m-0 text-dark">
              {isEditing ? 'Edit Purchase Order' : t('purchases', 'add_purchase')}
            </h4>
            <button className="btn btn-outline-secondary" onClick={closeForm}>
              <i className="bi bi-x-lg me-1"></i> {t('common', 'cancel')}
            </button>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label fw-bold text-dark">{t('common', 'reference')} / PO Number</label>
              <input type="text" className="form-control" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold text-dark">{t('purchases', 'supplier')}</label>
              <select className="form-select" value={supplier} onChange={e => setSupplier(e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold text-dark">{t('purchases', 'note')}</label>
              <input type="text" className="form-control" placeholder="Purchase notes..." value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>

          {/* Cart Table */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold m-0 text-dark">Items List</h6>
            <button className="btn btn-success btn-sm fw-bold" onClick={handleAddItem}>
              <i className="bi bi-plus-lg me-1"></i> Add Item
            </button>
          </div>

          <div className="table-responsive mb-3" style={{ overflow: 'visible', minHeight: cart.length > 0 ? '380px' : 'auto' }}>
            <table className="table custom-table align-middle" style={{ overflow: 'visible' }}>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Product</th>
                  <th style={{ width: '15%' }}>Cost Price</th>
                  <th style={{ width: '15%' }}>Unit</th>
                  <th style={{ width: '12%' }}>Qty</th>
                  <th style={{ width: '15%' }}>Subtotal</th>
                  <th style={{ width: '8%' }}>Disc %</th>
                  <th style={{ width: '3%' }} className="text-center">Del</th>
                </tr>
              </thead>
              <tbody style={{ overflow: 'visible' }}>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">Click "Add Item" to start adding products</td>
                  </tr>
                ) : (
                  applyPagination(cart, cartCurrentPage, cartRowsPerPage).map((item, pageIdx) => {
                    const idx = (cartCurrentPage - 1) * cartRowsPerPage + pageIdx;
                    return (
                      <tr key={idx} style={{ position: 'relative' }}>
                        <td className="ps-3 border-bottom py-3" style={{ minWidth: '320px', position: 'relative', overflow: 'visible' }}>
                          <SearchableProductSelect
                            products={products}
                            selectedProductId={item.productId}
                            onSelectProduct={(p) => handleSelectProduct(idx, p)}
                            placeholder="Type product name, SKU, or barcode..."
                          />
                        </td>
                        <td className="border-bottom">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-control"
                            value={item.unitPriceInput !== undefined ? item.unitPriceInput : String(item.unitPrice)}
                            onChange={e => {
                              const raw = e.target.value;
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              const newCart = [...cart];
                              newCart[idx].unitPriceInput = raw;
                              newCart[idx].unitPrice = parseFloat(raw) || 0;
                              setCart(newCart);
                            }}
                            onBlur={e => {
                              const newCart = [...cart];
                              newCart[idx].unitPriceInput = String(newCart[idx].unitPrice);
                              setCart(newCart);
                            }}
                          />
                        </td>
                        <td className="border-bottom">
                          <select className="form-select" value={item.unit || 'pcs'} onChange={e => updateCartItem(idx, 'unit', e.target.value)} style={{ fontSize: '0.875rem' }}>
                            <optgroup label="Quantity">
                              <option value="pcs">Piece (pcs)</option>
                              <option value="box">Box</option>
                              <option value="dozen">Dozen</option>
                              <option value="pack">Pack</option>
                              <option value="carton">Carton</option>
                              <option value="bundle">Bundle</option>
                              <option value="set">Set</option>
                              <option value="pair">Pair</option>
                              <option value="roll">Roll</option>
                            </optgroup>
                            <optgroup label="Weight">
                              <option value="kg">Kilogram (KG)</option>
                              <option value="gram">Gram (g)</option>
                              <option value="mg">Milligram (mg)</option>
                              <option value="lb">Pound (lb)</option>
                              <option value="oz">Ounce (oz)</option>
                              <option value="ton">Ton</option>
                            </optgroup>
                            <optgroup label="Volume">
                              <option value="liter">Liter (L)</option>
                              <option value="ml">Milliliter (ml)</option>
                              <option value="gallon">Gallon (gal)</option>
                            </optgroup>
                            <optgroup label="Length">
                              <option value="meter">Meter (m)</option>
                              <option value="cm">Centimeter (cm)</option>
                              <option value="inch">Inch (in)</option>
                              <option value="foot">Foot (ft)</option>
                              <option value="yard">Yard (yd)</option>
                            </optgroup>
                          </select>
                        </td>
                        <td className="border-bottom">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-control"
                            value={item.qtyInput !== undefined ? item.qtyInput : String(item.qty)}
                            onChange={e => {
                              const raw = e.target.value;
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              const newCart = [...cart];
                              newCart[idx].qtyInput = raw;
                              newCart[idx].qty = parseFloat(raw) || 0;
                              setCart(newCart);
                            }}
                            onBlur={e => {
                              const newCart = [...cart];
                              newCart[idx].qtyInput = String(newCart[idx].qty);
                              setCart(newCart);
                            }}
                          />
                        </td>
                        <td className="border-bottom">
                          <input type="text" className="form-control bg-light" readOnly value={`Rs.${((item.unitPrice || 0) * (item.qty || 0)).toFixed(2)}`} />
                        </td>
                        <td className="border-bottom">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-control"
                            value={item.discPercentInput !== undefined ? item.discPercentInput : String(item.discPercent)}
                            onChange={e => {
                              const raw = e.target.value;
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              const val = parseFloat(raw) || 0;
                              if (val > 100) return;
                              const newCart = [...cart];
                              newCart[idx].discPercentInput = raw;
                              newCart[idx].discPercent = val;
                              setCart(newCart);
                            }}
                            onBlur={e => {
                              const newCart = [...cart];
                              newCart[idx].discPercentInput = String(newCart[idx].discPercent);
                              setCart(newCart);
                            }}
                          />
                        </td>
                        <td className="border-bottom text-center">
                          <button className="btn btn-danger btn-sm p-1 rounded-sm" onClick={() => removeCartItem(idx)} style={{ width: '30px', height: '30px' }}>
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {cart.length > 0 && (
            <TableControls
              total={cart.length}
              currentPage={cartCurrentPage}
              rowsPerPage={cartRowsPerPage}
              onRowsPerPageChange={(n) => { setCartRowsPerPage(n); setCartCurrentPage(1); }}
              onPageChange={setCartCurrentPage}
            />
          )}

          {/* Totals Section */}
          <div className="row justify-content-end mt-4">
            <div className="col-md-5">
              <div className="card p-3 border-0 bg-light">
                <div className="d-flex justify-content-between mb-2">
                  <span>Item Subtotal:</span>
                  <span className="fw-bold">Rs. {totals.itemSubtotal.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Discount (%):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control text-end form-control-sm"
                    style={{ width: '80px' }}
                    value={overallDiscPercentInput}
                    onChange={e => {
                      const raw = e.target.value;
                      if (!/^\d*\.?\d*$/.test(raw)) return;
                      const val = parseFloat(raw) || 0;
                      if (val > 100) return;
                      setOverallDiscPercentInput(raw);
                      setOverallDiscPercent(val);
                    }}
                    onBlur={() => setOverallDiscPercentInput(String(overallDiscPercent))}
                  />
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Tax (%):</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control text-end form-control-sm"
                    style={{ width: '80px' }}
                    value={taxPercentInput}
                    onChange={e => {
                      const raw = e.target.value;
                      if (!/^\d*\.?\d*$/.test(raw)) return;
                      setTaxPercentInput(raw);
                      setTaxPercent(parseFloat(raw) || 0);
                    }}
                    onBlur={() => setTaxPercentInput(String(taxPercent))}
                  />
                </div>
                <hr />
                <div className="d-flex justify-content-between fs-5 fw-bold text-primary">
                  <span>Grand Total:</span>
                  <span>Rs. {totals.grandTotal.toFixed(2)}</span>
                </div>
                <button className="btn btn-primary btn-lg mt-3 w-100 fw-bold" onClick={submitPurchase}>
                  <i className="bi bi-check-circle me-1"></i> {isEditing ? 'Update Purchase Order' : 'Submit Purchase Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Listing view (when showForm is false)
  return (
    <AuthLayout>
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <h4 className="fw-bold m-0 text-dark">{t('purchases', 'title') || 'Purchases'}</h4>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
        <h4 className="fw-bold m-0">{t('purchases', 'title')}</h4>
        <div className="d-flex gap-2">
          <button
            onClick={exportToExcel}
            className="btn btn-outline-success fw-bold d-flex align-items-center gap-2"
            style={{ borderRadius: '6px' }}
          >
            <i className="bi bi-file-earmark-excel"></i> {language === 'ne' ? 'एक्सेल एक्सपोर्ट' : 'Export Excel'}
          </button>
          {isAdmin && (
            <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 text-nowrap" onClick={() => setShowForm(true)}>
              <i className="bi bi-plus-lg"></i> {t('purchases', 'add_purchase')}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 rounded-md shadow-sm p-3 mb-4 bg-white" style={{ borderRadius: '10px' }}>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>{t('reports', 'from_date') || 'From Date (BS/AD)'}</label>
            <BSDatePicker
              value={startDate}
              onChange={(val) => { setStartDate(val); setListCurrentPage(1); }}
              className="form-control bg-light border-0 p-2"
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>{t('reports', 'to_date') || 'To Date (BS/AD)'}</label>
            <BSDatePicker
              value={endDate}
              onChange={(val) => { setEndDate(val); setListCurrentPage(1); }}
              className="form-control bg-light border-0 p-2"
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Search Purchase / Product</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-0"><i className="bi bi-search text-muted"></i></span>
              <input 
                type="text" 
                className="form-control bg-light border-0 ps-0" 
                placeholder="Search PO #, supplier, product name, or SKU..." 
                value={searchTerm} 
                onChange={e => { setSearchTerm(e.target.value); setListCurrentPage(1); }} 
                style={{ height: '38px' }}
              />
            </div>
          </div>
          <div className="col-12 col-md-2">
            <button
              className="btn btn-outline-secondary w-100 fw-semibold d-flex align-items-center justify-content-center gap-1 border bg-white text-secondary"
              style={{ height: '38px', borderRadius: '6px' }}
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
                setListCurrentPage(1);
              }}
              title="Reset Filters"
            >
              <i className="bi bi-arrow-counterclockwise"></i> {t('common', 'reset') || 'Reset'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 border-0 shadow-sm" style={{ backgroundColor: 'var(--light-card)' }}>
        <h5 className="fw-bold mb-3">{t('purchases', 'title')}</h5>
        <div className="table-responsive">
          <table className="table custom-table">
            <thead>
              <tr>
                <th>{t('common', 'reference')}</th>
                <th>{t('purchases', 'purchase_date')}</th>
                <th>Products & Unit Price</th>
                <th>{t('purchases', 'total_amount')}</th>
                <th>{t('common', 'status')}</th>
                <th>{t('common', 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">{t('purchases', 'loading_purchases')}</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">{t('purchases', 'no_purchases')}</td></tr>
              ) : purchases.map(p => (
                <tr key={p.id}>
                  <td className="fw-bold text-primary">{p.poNumber}</td>
                  <td>{formatAdToBs(p.purchaseDate)}</td>
                  <td>
                    {p.items?.length > 0 ? (
                      <div className="d-flex flex-column gap-1">
                        {p.items.map((item: any, idx: number) => {
                          const prodName = products.find(prod => prod.id === item.productId)?.name || 'Unknown Product';
                          return (
                            <div key={idx} style={{ fontSize: '0.85rem' }} className="d-flex align-items-center flex-wrap">
                              <span className="text-dark"><i className="bi bi-box-seam me-1 text-muted"></i>{prodName} (x{item.quantity} {item.measurementUnit || 'pcs'})</span>
                              <span className="text-primary fw-bold ms-2">Rs. {(item.costPrice || item.unitPrice || 0).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted">0 products</span>
                    )}
                  </td>
                  <td className="fw-bold">
                    {p.totalRefunded > 0 ? (
                      <div>
                        <span className="text-decoration-line-through text-muted small d-block">
                          Rs. {Number(p.totalAmount).toFixed(2)}
                        </span>
                        <span className="text-danger fw-bold">
                          Rs. {Number(p.netAmount !== undefined ? p.netAmount : (p.totalAmount - p.totalRefunded)).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span>Rs. {Number(p.totalAmount).toFixed(2)}</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex flex-column align-items-start gap-1">
                      {p.status === 'RETURNED' || p.returnStatus === 'FULL' ? (
                        <span className="badge bg-danger-subtle text-danger px-2.5 py-1 rounded-pill fw-semibold">
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          {language === 'ne' ? 'फिर्ता (Returned)' : 'Returned'}
                        </span>
                      ) : p.status === 'PARTIALLY_RETURNED' || p.returnStatus === 'PARTIAL' ? (
                        <span className="badge bg-warning-subtle text-warning-emphasis px-2.5 py-1 rounded-pill fw-semibold">
                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                          {language === 'ne' ? 'आंशिक फिर्ता' : 'Partially Returned'}
                        </span>
                      ) : (
                        <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill fw-semibold">
                          <i className="bi bi-check-circle-fill me-1"></i> {p.status}
                        </span>
                      )}

                      <span className="badge bg-light text-secondary border px-2 py-0.5" style={{ fontSize: '0.72rem' }} title="Inventory Transaction STOCK_IN Recorded">
                        <i className="bi bi-box-arrow-in-down text-primary me-1"></i> Stock Credited
                      </span>
                      {p.user?.name && (
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>by {p.user.name}</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => setViewPurchase(p)}
                        title="View Purchase Details"
                      >
                        <i className="bi bi-eye"></i> View
                      </button>
                      {isAdmin && (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(p)} title="Edit Purchase">
                          <i className="bi bi-pencil-square"></i> {t('common', 'edit')}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => router.push(`/purchase-returns?poNumber=${encodeURIComponent(p.poNumber)}`)}
                        title={language === 'ne' ? 'आपूर्तिकर्तालाई सामान फिर्ता गर्नुहोस्' : 'Return items to supplier'}
                        disabled={p.status === 'RETURNED' || p.returnStatus === 'FULL'}
                      >
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <TableControls
          total={totalPurchases}
          currentPage={listCurrentPage}
          rowsPerPage={listRowsPerPage}
          onRowsPerPageChange={(n) => { setListRowsPerPage(n); setListCurrentPage(1); }}
          onPageChange={setListCurrentPage}
        />
      </div>

      {/* Purchase View Modal */}
      {viewPurchase && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white border-bottom-0">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-receipt"></i> Purchase Details — {viewPurchase.poNumber}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setViewPurchase(null)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Header Info */}
                <div className="row g-2 mb-3">
                  <div className="col-6 col-md-3">
                    <div className="text-muted small">PO Number</div>
                    <div className="fw-bold text-primary">{viewPurchase.poNumber}</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-muted small">Purchase Date</div>
                    <div className="fw-semibold">{formatAdToBs(viewPurchase.purchaseDate)}</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-muted small">Supplier</div>
                    <div className="fw-semibold">{viewPurchase.supplier?.name || 'Cash Supplier'}</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-muted small">Recorded By</div>
                    <div className="fw-semibold">{viewPurchase.user?.name || '—'}</div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="table-responsive border rounded-3 mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Product</th>
                        <th className="text-center">Qty Purchased</th>
                        <th className="text-center">Qty Returned</th>
                        <th className="text-center">Remaining</th>
                        <th className="text-end">Cost Price</th>
                        <th className="text-end">Net Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewPurchase.items || []).map((item: any, i: number) => {
                        const returnedQty = item.returnedQuantity ?? 0;
                        const remainingQty = item.remainingQuantity ?? item.quantity;
                        const costPrice = item.costPrice || item.unitPrice || 0;
                        const isFullyReturned = remainingQty <= 0;
                        return (
                          <tr key={i} style={isFullyReturned ? { opacity: 0.45 } : {}}>
                            <td>
                              <div className="fw-semibold">
                                {products.find((p: any) => p.id === item.productId)?.name || item.product?.name || `Product #${item.productId}`}
                              </div>
                              <small className="text-muted">{item.measurementUnit || 'pcs'}</small>
                              {isFullyReturned && <span className="badge bg-secondary ms-1" style={{ fontSize: '9px' }}>Returned</span>}
                            </td>
                            <td className="text-center text-secondary fw-semibold">{item.quantity}</td>
                            <td className="text-center text-danger fw-semibold">{returnedQty > 0 ? returnedQty : '—'}</td>
                            <td className="text-center fw-bold text-success">{remainingQty}</td>
                            <td className="text-end">Rs. {costPrice.toFixed(2)}</td>
                            <td className="text-end fw-bold">Rs. {(costPrice * remainingQty).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="row justify-content-end">
                  <div className="col-md-5">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Original Total:</span>
                      <span className={viewPurchase.totalRefunded > 0 ? 'text-decoration-line-through text-muted' : 'fw-bold'}>
                        Rs. {Number(viewPurchase.totalAmount).toFixed(2)}
                      </span>
                    </div>
                    {(viewPurchase.totalRefunded || 0) > 0 && (
                      <div className="d-flex justify-content-between mb-1 text-danger">
                        <span>Total Refunded:</span>
                        <span className="fw-bold">- Rs. {Number(viewPurchase.totalRefunded).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold fs-6 border-top pt-2">
                      <span>Net Amount:</span>
                      <span className="text-primary">
                        Rs. {Number(viewPurchase.netAmount ?? (viewPurchase.totalAmount - (viewPurchase.totalRefunded || 0))).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Return Audit Trail */}
                {(viewPurchase.totalRefunded || 0) > 0 && viewPurchase.purchaseReturns?.length > 0 && (
                  <div className="mt-3 border rounded p-2" style={{ fontSize: '12px', background: '#fff8e1', borderColor: '#ffe082' }}>
                    <div className="d-flex align-items-center gap-1 mb-2 fw-bold text-warning-emphasis">
                      <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                      {viewPurchase.returnStatus === 'FULL' ? 'Fully Returned to Supplier' : 'Partially Returned to Supplier'}
                    </div>
                    {viewPurchase.purchaseReturns.map((ret: any, ri: number) => (
                      <div key={ri} className="text-secondary" style={{ lineHeight: '1.7' }}>
                        <div><span className="fw-semibold">Return No:</span> {ret.returnNo || `Return #${ri + 1}`}</div>
                        <div><span className="fw-semibold">Return Date:</span> {new Date(ret.createdAt || ret.returnDate).toLocaleDateString()}</div>
                        <div><span className="fw-semibold">Reason:</span> {ret.reason || 'Supplier Return'}</div>
                        <div><span className="fw-semibold text-danger">Refunded:</span> <span className="text-danger fw-bold">Rs. {Number(ret.totalAmount || 0).toFixed(2)}</span></div>
                        {ri < (viewPurchase.purchaseReturns.length - 1) && <hr className="my-1" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setViewPurchase(null)}>Close</button>
                {(viewPurchase.returnStatus !== 'FULL' && viewPurchase.status !== 'RETURNED') && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => {
                      setViewPurchase(null);
                      router.push(`/purchase-returns?poNumber=${encodeURIComponent(viewPurchase.poNumber)}`);
                    }}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i> Return to Supplier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
