'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBs } from '@/utils/nepaliDate';
import TableControls, { applyPagination } from '@/components/TableControls';
import {
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
} from '@/redux/api/purchasesApi';

export default function PurchasesPage() {
  const router = useRouter();
  const { token, api, activeFiscalYear } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [auxLoading, setAuxLoading] = useState(true);
  const [cartRowsPerPage, setCartRowsPerPage] = useState(10);
  const [listRowsPerPage, setListRowsPerPage] = useState(10);
  const [cartCurrentPage, setCartCurrentPage] = useState(1);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // RTK Query for Purchases
  const { data: purchaseData, isFetching: loading } = useGetPurchasesQuery({
    page: listCurrentPage,
    limit: listRowsPerPage,
    search: searchTerm,
  });
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
  const [overallDiscPercent, setOverallDiscPercent] = useState<number>(0);

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
      setProducts(productsRes.data.items || []);
      setSuppliers(suppliersRes.data.items || []);
    } catch (err) {
      console.error(err);
    }
    setAuxLoading(false);
  };

  const handleAddItem = () => {
    setCart([...cart, { 
      productId: '', 
      unitPrice: 0, 
      unit: 'pcs',
      qty: 1, 
      discPercent: 0 
    }]);
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
      alert("Please add at least one valid item.");
      return;
    }
    
    const mappedItems = validCart.map(c => ({
      productId: parseInt(c.productId),
      quantity: c.qty,
      costPrice: c.unitPrice,
      measurementUnit: c.unit || 'pcs',
    }));

    const payload = {
      poNumber: referenceNo,
      supplierId: supplier ? parseInt(supplier) : null,
      purchaseDate: new Date().toISOString(),
      totalAmount: totals.grandTotal,
      items: mappedItems
    };

    try {
      if (isEditing && editingPurchaseId) {
        await updatePurchase({ id: editingPurchaseId, data: payload }).unwrap();
        alert(t('common', 'updated_successfully') || 'Purchase Order updated successfully!');
      } else {
        await createPurchase(payload).unwrap();
        alert(t('common', 'saved_successfully') || 'Purchase Order created successfully!');
      }

      closeForm();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || t('common', 'error'));
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingPurchaseId(null);
    setCart([]);
    setReferenceNo(`PUR-${Math.floor(Math.random() * 1000000000)}`);
    setTaxPercent(0);
    setOverallDiscPercent(0);
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
        unit: item.measurementUnit || 'pcs',
        qty: item.quantity,
        discPercent: 0
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
        <div className="card p-4 border-0 shadow-sm" style={{ backgroundColor: 'var(--light-card)' }}>
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

          <div className="table-responsive mb-3">
            <table className="table custom-table align-middle">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Product</th>
                  <th style={{ width: '15%' }}>Cost Price</th>
                  <th style={{ width: '15%' }}>Unit</th>
                  <th style={{ width: '12%' }}>Qty</th>
                  <th style={{ width: '15%' }}>Subtotal</th>
                  <th style={{ width: '8%' }}>Disc %</th>
                  <th style={{ width: '5%' }} className="text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">Click "Add Item" to start adding products</td>
                  </tr>
                ) : (
                  applyPagination(cart, cartCurrentPage, cartRowsPerPage).map((item, pageIdx) => {
                    const idx = (cartCurrentPage - 1) * cartRowsPerPage + pageIdx;
                    return (
                      <tr key={idx}>
                        <td className="ps-3 border-bottom py-3">
                          <select className="form-select" value={item.productId} onChange={e => updateCartItem(idx, 'productId', e.target.value)}>
                            <option value="">-- Product --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.SKU ? `[${p.SKU}] ` : ''}{p.name}</option>)}
                          </select>
                        </td>
                        <td className="border-bottom">
                          <input type="number" min="0" step="any" className="form-control" value={item.unitPrice} onChange={e => updateCartItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="border-bottom">
                          <select className="form-select" value={item.unit} onChange={e => updateCartItem(idx, 'unit', e.target.value)}>
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
                          <input type="number" min="0" step="any" className="form-control" value={item.qty} onChange={e => updateCartItem(idx, 'qty', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="border-bottom">
                          <input type="text" className="form-control bg-light" readOnly value={`Rs.${((item.unitPrice || 0) * (item.qty || 0)).toFixed(2)}`} />
                        </td>
                        <td className="border-bottom">
                          <input type="number" min="0" step="any" max="100" className="form-control" value={item.discPercent} onChange={e => updateCartItem(idx, 'discPercent', parseFloat(e.target.value) || 0)} />
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
                  <input type="number" className="form-control text-end form-control-sm" style={{ width: '80px' }} value={overallDiscPercent} onChange={e => setOverallDiscPercent(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Tax (%):</span>
                  <input type="number" className="form-control text-end form-control-sm" style={{ width: '80px' }} value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} />
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
        <div className="d-flex gap-3 align-items-center flex-grow-1 justify-content-end" style={{ maxWidth: '600px' }}>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0" 
              placeholder={t('common', 'search') || 'Search purchases...'} 
              value={searchTerm} 
              onChange={e => { setSearchTerm(e.target.value); setListCurrentPage(1); }} 
            />
          </div>
          <button className="btn btn-primary fw-bold d-flex align-items-center gap-2 px-3 text-nowrap" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg"></i> {t('purchases', 'add_purchase')}
          </button>
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
                  <td className="fw-bold">Rs. {Number(p.totalAmount).toFixed(2)}</td>
                  <td>
                    <span className="badge bg-success-subtle text-success px-2 py-1 rounded-pill">{p.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(p)} title="Edit Purchase">
                      <i className="bi bi-pencil-square"></i> {t('common', 'edit')}
                    </button>
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
    </AuthLayout>
  );
}
