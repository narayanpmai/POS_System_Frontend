'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  SKU: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  minStockAlert: number;
  taxRate: number;
  category: Category;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  points: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  taxAmount: number;
  total: number;
}

export default function POSPage() {
  const { token, api } = useAuth();
  
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Filters & UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  
  // Modals & Receipts
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any | null>(null);

  // Load catalogs
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const [prodRes, catRes, custRes, settingsRes] = await Promise.all([
          api.get('/products?limit=100'),
          api.get('/products/categories'),
          api.get('/customers?limit=100'),
          api.get('/settings'),
        ]);
        
        setProducts(prodRes.data.items || []);
        setCategories(catRes.data || []);
        setCustomers(custRes.data.items || []);
        setStoreSettings(settingsRes.data || null);

        // Prepopulate Narayan Chhetri customer if exists for visual demonstration matches
        const narayan = (custRes.data.items || []).find((c: any) => c.name.toLowerCase().includes('narayan'));
        if (narayan) {
          setSelectedCustomerId(narayan.id);
        }
      } catch (err) {
        console.error('Error fetching POS dependencies:', err);
      }
    };
    loadData();
  }, [token]);

  // Add Item to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (product.stock < currentQty + 1) {
        alert(`Insufficient stock. Only ${product.stock} units available.`);
        return;
      }
      
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      recalculateCartItem(newCart[existingIndex]);
      setCart(newCart);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        price: product.price,
        taxAmount: 0,
        total: 0,
      };
      recalculateCartItem(newItem);
      setCart([...cart, newItem]);
    }
  };

  // Recalculate helper
  const recalculateCartItem = (item: CartItem) => {
    const subtotal = item.price * item.quantity;
    const taxRate = item.product.taxRate || 0;
    item.taxAmount = subtotal * (taxRate / 100);
    item.total = subtotal + item.taxAmount;
  };

  // Cart Adjustments
  const adjustQuantity = (productId: number, amount: number) => {
    const existingIndex = cart.findIndex((item) => item.product.id === productId);
    if (existingIndex === -1) return;

    const newCart = [...cart];
    const item = newCart[existingIndex];
    const targetQty = item.quantity + amount;

    if (targetQty <= 0) {
      newCart.splice(existingIndex, 1);
    } else {
      if (item.product.stock < targetQty) {
        alert(`Insufficient stock. Only ${item.product.stock} units available.`);
        return;
      }
      item.quantity = targetQty;
      recalculateCartItem(item);
    }
    setCart(newCart);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const getSubtotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const getTaxTotal = () => cart.reduce((acc, item) => acc + item.taxAmount, 0);
  const getGrossTotal = () => getSubtotal() + getTaxTotal();
  const getNetPayable = () => {
    const payable = getGrossTotal() - discountAmount;
    return Math.max(0, payable);
  };

  // Create Quick Customer CRM
  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    try {
      const res = await api.post('/customers', {
        name: newCustomerName,
        phone: newCustomerPhone || undefined,
      });
      setCustomers([...customers, res.data]);
      setSelectedCustomerId(res.data.id);
      
      // Clear fields
      setNewCustomerName('');
      setNewCustomerPhone('');
      
      // Close Bootstrap modal programmatically
      const modalElement = document.getElementById('newCustomerModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating quick customer profile');
    }
  };

  // Checkout execution
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    setSubmittingCheckout(true);
    try {
      const payload = {
        customerId: selectedCustomerId || undefined,
        paymentMethod: paymentMethod,
        discountAmount: Number(discountAmount),
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await api.post('/sales/checkout', payload);
      setCheckoutResult(res.data);
      
      // Deduct loaded inventory stock locally
      const updatedProducts = products.map((p) => {
        const cartMatch = cart.find((c) => c.product.id === p.id);
        if (cartMatch) {
          return { ...p, stock: p.stock - cartMatch.quantity };
        }
        return p;
      });
      setProducts(updatedProducts);

      // Open printable receipt modal
      const modalElement = document.getElementById('receiptModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }

      // Reset cart variables
      setCart([]);
      setDiscountAmount(0);
      setSelectedCustomerId(null);
      setSubmittingCheckout(false);
    } catch (err: any) {
      setSubmittingCheckout(false);
      alert(err.response?.data?.message || 'Checkout failed. Please try again.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!checkoutResult) return;

    const element = document.getElementById('printable-receipt-modal');
    if (!element) return;

    try {
      // Dynamic import to prevent SSR Node server crash
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin:       [6, 6, 6, 6] as [number, number, number, number],
        filename:     `Invoice-${checkoutResult.invoiceNo || 'INV'}.pdf`,
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

  // Filter logic
  const filteredProducts = products.filter((p) => {
    const searchMatch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.SKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    return searchMatch;
  });

  return (
    <AuthLayout>
      <div className="row g-4 animate-fade-in-up">
        {/* ==============================================
            LEFT PANEL: PRODUCTS DISCOVERY GRID
            ============================================== */}
        <div className="col-12 col-xl-8">
          
          {/* Header control: Search bar & Collapsible scan toggle */}
          <div className="d-flex gap-2 mb-4">
            <div className="input-group shadow-sm border rounded bg-white flex-grow-1" style={{ overflow: 'hidden' }}>
              <span className="input-group-text bg-white border-0 ps-3 pe-2 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-0 bg-transparent py-2.5 shadow-none"
                placeholder="Search product by name or SKU"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ outline: 'none' }}
              />
              <button 
                className="btn btn-primary px-4 py-2 border-0 fw-bold" 
                style={{ backgroundColor: '#0d6efd', borderRadius: '0px' }}
                onClick={() => {}}
              >
                Search
              </button>
            </div>
            
            <button 
              className="btn btn-outline-secondary px-3 d-flex align-items-center justify-content-center border"
              style={{ borderRadius: '6px', border: '1px solid #dee2e6', backgroundColor: 'var(--light-card)' }}
              type="button"
              onClick={() => {
                const term = prompt("Simulate Barcode / SKU scan:");
                if (term) {
                  const matchedProduct = products.find(
                    (p) => p.barcode === term.trim() || p.SKU === term.trim()
                  );
                  if (matchedProduct) {
                    addToCart(matchedProduct);
                  } else {
                    alert(`No product matched barcode/SKU: "${term}"`);
                  }
                }
              }}
              title="Simulate Barcode Scan"
            >
              <i className="bi bi-upc-scan text-warning"></i>
            </button>
          </div>

          {/* Catalog products list */}
          <div className="row g-3 overflow-y-auto pe-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {filteredProducts.length === 0 ? (
              <div className="col-12 text-center py-5 text-muted">
                <i className="bi bi-box-seam fs-1 mb-2"></i>
                <p>No products match selected search parameters</p>
              </div>
            ) : (
              filteredProducts.map((prod) => (
                <div key={prod.id} className="col-6 col-sm-4 animate-fade-in-up animate-delay-100">
                  <div 
                    className="pos-product-card" 
                    onClick={() => addToCart(prod)}
                  >
                    <h6 className="fw-bold text-dark mb-2 text-truncate" title={prod.name} style={{ fontSize: '1rem' }}>
                      {prod.name}
                    </h6>
                    <div className="fw-bold mb-2" style={{ color: '#0d6efd', fontSize: '1.1rem' }}>
                      Rs.{prod.price.toFixed(2)}
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      Stock: {prod.stock}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ==============================================
            RIGHT PANEL: VIRTUAL CART & CHECKOUT PANEL
            ============================================== */}
        <div className="col-12 col-xl-4 animate-slide-in-right animate-delay-200">
          <div className="pos-cart p-4">
            
            {/* Cart Header */}
            <div className="pb-3 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold text-dark m-0">Current Order</h5>
            </div>

            {/* Customer select */}
            <div className="mb-3 d-flex gap-2">
              <select
                className="form-select"
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value) || null)}
                style={{ borderRadius: '8px', padding: '10px 14px', backgroundColor: 'var(--light-bg)', fontSize: '0.9rem' }}
              >
                <option value="">Walk-In Customer (Default)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                type="button"
                data-bs-toggle="modal"
                data-bs-target="#newCustomerModal"
                style={{ borderRadius: '8px', width: '42px' }}
              >
                <i className="bi bi-person-plus-fill"></i>
              </button>
            </div>

            {/* Cart Body: Cart items list */}
            <div className="pos-cart-items-list mb-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 460px)', minHeight: '220px' }}>
              {cart.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                  <i className="bi bi-cart-x fs-1 mb-2 text-secondary"></i>
                  <p style={{ fontSize: '0.9rem' }}>Cart is currently empty. Click on a product to add it!</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="d-flex justify-content-between align-items-center py-3 border-bottom">
                    <div style={{ flex: '1', minWidth: '0' }}>
                      <h6 className="fw-bold text-dark m-0 text-truncate" title={item.product.name} style={{ fontSize: '0.95rem' }}>
                        {item.product.name}
                      </h6>
                      <small className="text-secondary">Rs.{item.price.toFixed(2)}</small>
                    </div>

                    <div className="d-flex align-items-center mx-2">
                      <button 
                        className="btn btn-sm btn-light border px-2 py-0.5" 
                        style={{ borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px', borderRight: 'none' }}
                        onClick={() => adjustQuantity(item.product.id, -1)}
                      >
                        -
                      </button>
                      <input 
                        type="text" 
                        className="form-control text-center py-0.5 bg-white" 
                        value={item.quantity} 
                        readOnly 
                        style={{ width: '38px', border: '1px solid #dee2e6', borderRadius: '0px', fontSize: '0.85rem', height: '26px' }} 
                      />
                      <button 
                        className="btn btn-sm btn-light border px-2 py-0.5" 
                        style={{ borderTopRightRadius: '4px', borderBottomRightRadius: '4px', borderLeft: 'none' }}
                        onClick={() => adjustQuantity(item.product.id, 1)}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-end d-flex align-items-center gap-3">
                      <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                        Rs.{(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button className="btn btn-link text-danger p-0 border-0" onClick={() => removeFromCart(item.product.id)}>
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer: Summary and Pay Now button */}
            <div className="border-top pt-3">
              <div className="d-flex justify-content-between mb-2 text-secondary fs-7">
                <span>Total Items:</span>
                <span className="fw-bold text-dark">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-secondary fs-7">
                <span>Sub Total:</span>
                <span className="fw-bold text-dark">Rs.{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 align-items-center text-secondary fs-7">
                <span>Discount:</span>
                <input
                  type="number"
                  min="0"
                  className="form-control form-control-sm text-end"
                  placeholder="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  style={{ width: '85px', borderRadius: '6px', backgroundColor: 'var(--light-bg)', border: '1px solid #dee2e6' }}
                />
              </div>
              
              <div className="border-top my-2"></div>

              <div className="d-flex justify-content-between mb-3 fw-bold fs-5">
                <span className="text-primary">Grand Total:</span>
                <span style={{ color: '#0d6efd' }}>Rs. {getNetPayable().toFixed(2)}</span>
              </div>

              {/* Payment Select and Paid Amount */}
              <div className="d-flex gap-2 mb-3">
                <select
                  className="form-select form-select-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ borderRadius: '6px', backgroundColor: 'var(--light-bg)', border: '1px solid #dee2e6', padding: '8px 12px' }}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="QR">QR</option>
                </select>
                <input
                  type="text"
                  className="form-control form-control-sm text-end bg-light"
                  value={getNetPayable().toFixed(2)}
                  readOnly
                  style={{ borderRadius: '6px', border: '1px solid #dee2e6', padding: '8px 12px', fontWeight: 'bold' }}
                />
              </div>

              {/* Orange Pay Now Button */}
              <button
                className="btn w-100 py-2.5 fw-bold text-white d-flex align-items-center justify-content-center gap-2 border-0 shadow-lg"
                style={{ background: 'var(--gradient-secondary)', borderRadius: '30px', fontSize: '1.1rem', transition: 'var(--transition-bounce)' }}
                disabled={cart.length === 0 || submittingCheckout}
                onClick={handleCheckoutSubmit}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
              >
                {submittingCheckout ? (
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                ) : (
                  <i className="bi bi-credit-card me-2"></i>
                )}
                <span>Pay Now</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ==============================================
          MODAL 1: REGISTER QUICK CUSTOMER MODAL
          ============================================== */}
      <div className="modal fade text-dark" id="newCustomerModal" tabIndex={-1} aria-labelledby="newCustomerModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-lg" style={{ borderRadius: '12px' }}>
            <div className="modal-header bg-primary text-white border-none p-3">
              <h5 className="modal-title fw-bold" id="newCustomerModalLabel">
                <i className="bi bi-person-plus-fill me-2"></i>Register Quick CRM Customer
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleQuickCreateCustomer}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Customer Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Richard Hendricks"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Telephone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. 9841XXXXXX"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 p-3 bg-light d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light border rounded-md" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary rounded-md">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ==============================================
          MODAL 2: PRINTABLE THERMAL RECEIPT MODAL
          ============================================== */}
      <div className="modal fade text-dark" id="receiptModal" tabIndex={-1} aria-labelledby="receiptModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
          <div className="modal-content border-0 shadow-lg rounded-lg" style={{ borderRadius: '12px' }}>
            <div className="modal-header bg-dark text-white border-none p-3 no-print">
              <h5 className="modal-title fw-bold" id="receiptModalLabel">
                <i className="bi bi-printer-fill me-2 text-warning"></i>POS Checkout Success
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-3">
              
              {/* Receipt formatting for window.print() */}
              <div id="printable-receipt-modal" className="thermal-receipt mx-auto">
                <div className="text-center">
                  <h5 className="m-0 fw-bold" style={{ fontFamily: 'Outfit' }}>
                    {storeSettings?.storeName || 'PANCHPOKHARI KOSELI GHAR'}
                  </h5>
                  <p className="m-0 text-muted" style={{ fontSize: '10px' }}>
                    {storeSettings?.address || '123 Retail Plaza'}<br />
                    Tel: {storeSettings?.phone || '+1 555-0100'}<br />
                    TAX No: {storeSettings?.taxNumber || 'TAX-VAT-8292'}<br />
                    Cashier: {checkoutResult?.cashier?.name || 'Cashier'}
                  </p>
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                <div style={{ fontSize: '10px' }}>
                  <strong>Invoice:</strong> {checkoutResult?.invoiceNo || 'INV-00000'}<br />
                  <strong>Date:</strong> {checkoutResult ? formatAdToBsFull(checkoutResult.createdAt) : ''}<br />
                  <strong>Customer:</strong> {checkoutResult?.customer?.name || 'Walk-In Customer'}
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
                    {checkoutResult?.items?.map((item: any, idx: number) => (
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
                    <span>Rs. {Number(checkoutResult?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Tax:</span>
                    <span>Rs. {Number(checkoutResult?.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  {Number(checkoutResult?.discountAmount) > 0 && (
                    <div className="d-flex justify-content-between text-danger">
                      <span>Discount:</span>
                      <span>-Rs. {Number(checkoutResult?.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold border-top pt-1 mt-1 fs-6">
                    <span>TOTAL PAID:</span>
                    <span>Rs. {Number(checkoutResult?.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="thermal-receipt-divider" style={{ borderTop: '1px dashed #666', margin: '8px 0' }}></div>

                {/* QR Code and customer points */}
                <div className="text-center font-mono" style={{ fontSize: '10px' }}>
                  {checkoutResult?.customer && (
                    <div className="mb-2">
                      <strong>Loyalty points earned:</strong> +{Math.floor(Number(checkoutResult?.totalAmount) / 10)} pts<br />
                      <strong>Total Points Balance:</strong> {checkoutResult?.customer?.points} pts
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
