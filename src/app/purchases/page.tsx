'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { formatAdToBs } from '@/utils/nepaliDate';

export default function PurchasesPage() {
  const { token, api, activeFiscalYear } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Purchase Form UI state
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [referenceNo, setReferenceNo] = useState(`PUR-${Math.floor(Math.random() * 1000000000)}`);
  const [note, setNote] = useState('');
  const [supplier, setSupplier] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [overallDiscPercent, setOverallDiscPercent] = useState<number>(0);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, activeFiscalYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchasesRes, productsRes, suppliersRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/products?limit=1000'), // fetch all for simple dropdown
        api.get('/suppliers')
      ]);
      setPurchases(purchasesRes.data);
      setProducts(productsRes.data.items || []);
      setSuppliers(suppliersRes.data.items || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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

    // Auto-fill price and unit if product is selected
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
    
    // Map to backend schema requirements
    const mappedItems = validCart.map(c => ({
      productId: parseInt(c.productId),
      quantity: c.qty,
      costPrice: c.unitPrice,
      measurementUnit: c.unit || 'pcs',
    }));

    try {
      await api.post('/purchases', {
        poNumber: referenceNo,
        purchaseDate: new Date().toISOString(),
        totalAmount: totals.grandTotal,
        items: mappedItems
      });
      alert('Purchase Order created successfully!');
      setShowForm(false);
      setCart([]);
      setReferenceNo(`PUR-${Math.floor(Math.random() * 1000000000)}`);
      setTaxPercent(0);
      setOverallDiscPercent(0);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating purchase');
    }
  };

  if (showForm) {
    return (
      <AuthLayout>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="font-weight-bold m-0 d-flex align-items-center gap-2 text-dark">
            <i className="bi bi-cart3 text-primary"></i> New Purchase Order
          </h5>
          <button className="btn btn-light border bg-white font-weight-semibold" onClick={() => setShowForm(false)}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </button>
        </div>

        {/* Section 1: Supplier Info */}
        <div className="card border-0 rounded-md p-4 shadow-sm mb-4" style={{ backgroundColor: 'var(--light-card)' }}>
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <label className="form-label font-weight-bold fs-7 text-dark mb-1">Supplier <span className="text-danger">*</span></label>
              <select className="form-select border-1" value={supplier} onChange={e => setSupplier(e.target.value)}>
                <option value="">-- Select Supplier --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label font-weight-bold fs-7 text-dark mb-1">Note</label>
              <input type="text" className="form-control border-1" placeholder="Optional note" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label font-weight-bold fs-7 text-dark mb-1">Reference No</label>
              <input type="text" className="form-control border-1 bg-light" readOnly value={referenceNo} />
            </div>
          </div>
        </div>

        {/* Section 2: Purchase Items */}
        <div className="card border-0 rounded-md p-0 shadow-sm mb-4" style={{ backgroundColor: 'var(--light-card)', overflow: 'hidden' }}>
          <div className="p-3 d-flex justify-content-between align-items-center border-bottom">
            <h6 className="font-weight-bold m-0 d-flex align-items-center gap-2">
              <i className="bi bi-list-ul text-primary"></i> Purchase Items
            </h6>
            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 font-weight-semibold" onClick={handleAddItem}>
              <i className="bi bi-plus-circle"></i> Add Item
            </button>
          </div>
          
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                  <th className="font-weight-bold text-dark py-3 ps-3 border-0" style={{ width: '30%' }}>Product</th>
                  <th className="font-weight-bold text-dark py-3 border-0">Unit Price (Rs.)</th>
                  <th className="font-weight-bold text-dark py-3 border-0">Unit</th>
                  <th className="font-weight-bold text-dark py-3 border-0">Qty</th>
                  <th className="font-weight-bold text-dark py-3 border-0">Subtotal</th>
                  <th className="font-weight-bold text-dark py-3 border-0">Disc %</th>
                  <th className="font-weight-bold text-dark py-3 border-0 text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">Click "Add Item" to start adding products</td>
                  </tr>
                ) : (
                  cart.map((item, idx) => (
                    <tr key={idx}>
                      <td className="ps-3 border-bottom py-3">
                        <select className="form-select" value={item.productId} onChange={e => updateCartItem(idx, 'productId', e.target.value)}>
                          <option value="">-- Product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="border-bottom">
                        <input type="number" min="0" step="0.01" className="form-control" value={item.unitPrice} onChange={e => updateCartItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
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
                        <input type="number" min="1" className="form-control" value={item.qty} onChange={e => updateCartItem(idx, 'qty', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="border-bottom">
                        <input type="text" className="form-control bg-light" readOnly value={`Rs.${((item.unitPrice || 0) * (item.qty || 0)).toFixed(2)}`} />
                      </td>
                      <td className="border-bottom">
                        <input type="number" min="0" max="100" className="form-control" value={item.discPercent} onChange={e => updateCartItem(idx, 'discPercent', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="border-bottom text-center">
                        <button className="btn btn-danger btn-sm p-1 rounded-sm" onClick={() => removeCartItem(idx)} style={{ width: '30px', height: '30px' }}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Summary & Submit */}
        <div className="card border-0 rounded-md p-4 shadow-sm" style={{ backgroundColor: 'var(--light-card)' }}>
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label font-weight-bold fs-7 text-dark mb-1">Tax (%)</label>
                  <input type="number" min="0" className="form-control" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-6">
                  <label className="form-label font-weight-bold fs-7 text-dark mb-1">Overall Disc (%)</label>
                  <input type="number" min="0" max="100" className="form-control" value={overallDiscPercent} onChange={e => setOverallDiscPercent(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            
            <div className="col-12 col-md-6 d-flex flex-column align-items-end justify-content-center">
              <div style={{ minWidth: '250px' }}>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary font-weight-semibold">Subtotal:</span>
                  <span className="font-weight-bold text-dark">Rs.{totals.itemSubtotal.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary font-weight-semibold">Discount:</span>
                  <span className="font-weight-bold text-danger">-Rs.{totals.overallDisc.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-3 border-bottom pb-3">
                  <span className="text-secondary font-weight-semibold">Tax:</span>
                  <span className="font-weight-bold text-info">+Rs.{totals.taxAmt.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-4">
                  <span className="text-dark font-weight-bold fs-5">Grand Total:</span>
                  <span className="font-weight-bold fs-5 text-primary">Rs.{totals.grandTotal.toFixed(2)}</span>
                </div>
                
                <div className="d-flex justify-content-end">
                  <button className="btn btn-primary font-weight-bold d-flex align-items-center gap-2 px-4 py-2" style={{ backgroundColor: '#0d6efd' }} onClick={submitPurchase}>
                    <i className="bi bi-check-circle"></i> Submit Purchase
                  </button>
                </div>
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="font-weight-bold m-0">Purchase Orders</h4>
        <button className="btn btn-primary font-weight-bold d-flex align-items-center gap-2 px-3" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-lg"></i> New Purchase
        </button>
      </div>

      <div className="card p-4 border-0 shadow-sm" style={{ backgroundColor: 'var(--light-card)' }}>
        <h5 className="font-weight-bold mb-3">Recent Purchases</h5>
        <div className="table-responsive">
          <table className="table custom-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Purchase Date</th>
                <th>Items Count</th>
                <th>Total Amount (Rs.)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-muted">No purchases recorded yet</td></tr>
              ) : purchases.map(p => (
                <tr key={p.id}>
                  <td className="font-weight-bold text-primary">{p.poNumber}</td>
                  <td>{formatAdToBs(p.purchaseDate)}</td>
                  <td>{p.items?.length || 0} products</td>
                  <td className="font-weight-bold">Rs. {p.totalAmount.toFixed(2)}</td>
                  <td>
                    <span className="badge bg-success-subtle text-success px-2 py-1 rounded-pill">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthLayout>
  );
}
