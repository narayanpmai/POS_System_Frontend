'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import { printThermalReceipt } from '@/utils/printReceipt';
import SearchableCustomerSelect from '@/components/SearchableCustomerSelect';
import { useCustomAlert } from '@/context/CustomAlertContext';
import { formatStock } from '@/utils/number';

interface UnitConversion {
  id: number;
  baseUnit: string;
  secondaryUnit: string;
  conversionFactor: number;
}

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
  unit?: string;
  taxRate?: number;
  category?: Category;
  unitConversions?: UnitConversion[];
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
  selectedUnit?: string;
  selectedUnitQuantity?: number;
  conversionFactor?: number;
}

export default function POSPage() {
  const { token, api } = useAuth();
  const { t } = useLanguage();
  const { showAlert } = useCustomAlert();
  
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

  // Hardware Barcode Scanner Ref & Integration (Smart HC-6052 & USB HID presentation scanners)
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shift Register States
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftMode, setShiftMode] = useState<'START' | 'CLOSE'>('START');
  const [openingFloat, setOpeningFloat] = useState<number>(5000);
  const [closingCount, setClosingCount] = useState<number>(0);
  const [reconciliationSummary, setReconciliationSummary] = useState<any | null>(null);
  const [submittingShift, setSubmittingShift] = useState(false);

  const fetchCurrentShift = async () => {
    try {
      const res = await api.get('/shifts/current');
      setCurrentShift(res.data || null);
    } catch (err) {
      console.error('Failed to load current shift:', err);
    }
  };

  const handleStartShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingShift(true);
      const res = await api.post('/shifts/start', { cashStart: Number(openingFloat) });
      setCurrentShift(res.data);
      setShowShiftModal(false);
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Failed to start shift', 'Shift Error', 'error');
    } finally {
      setSubmittingShift(false);
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingShift(true);
      const res = await api.post('/shifts/close', { cashEnd: Number(closingCount) });
      setReconciliationSummary(res.data);
      setCurrentShift(null);
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Failed to close shift', 'Shift Error', 'error');
    } finally {
      setSubmittingShift(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentShift();
    }
  }, [token]);

  // Auto-focus search input on page mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Helper to handle barcode match and auto-add to cart
  const processBarcodeScan = async (scannedCode: string): Promise<boolean> => {
    const code = scannedCode.trim();
    if (!code) return false;

    // Search by exact Barcode or SKU match first, then by substring in loaded products
    let matchedProduct = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
        p.SKU.toLowerCase() === code.toLowerCase()
    ) || products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase().includes(code.toLowerCase())) ||
        p.SKU.toLowerCase().includes(code.toLowerCase()) ||
        p.name.toLowerCase().includes(code.toLowerCase())
    );

    // Fallback: If not found in loaded memory, query server directly
    if (!matchedProduct) {
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(code)}&inStockOnly=true&limit=5`);
        const items = res.data?.items || res.data || [];
        if (items.length > 0) {
          matchedProduct = items[0];
          setProducts((prev) => {
            const map = new Map<number, Product>(prev.map((p) => [p.id, p]));
            map.set(matchedProduct!.id, matchedProduct!);
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.error('POS barcode lookup error:', err);
      }
    }

    if (matchedProduct) {
      if (matchedProduct.stock <= 0) {
        showAlert(`"${matchedProduct.name}" is out of stock!`, 'Out of Stock', 'warning');
        return false;
      }
      addToCart(matchedProduct);
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.style.borderColor = '#198754';
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.style.borderColor = '';
        }, 600);
      }
      return true;
    }
    return false;
  };

  // Debounced server search when typing in search bar
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term || term.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(term)}&inStockOnly=true&limit=50`);
        const items = res.data?.items || res.data || [];
        if (items.length > 0) {
          setProducts((prev) => {
            const map = new Map<number, Product>(prev.map((p) => [p.id, p]));
            items.forEach((item: Product) => map.set(item.id, item));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.error('POS server search error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, api]);

  // Global keydown listener for hands-free scanning with Smart HC-6052 scanner anywhere on screen
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // If Enter is pressed while focused in search input or barcode buffer is populated
      if (e.key === 'Enter') {
        if (target === searchInputRef.current && searchTerm) {
          e.preventDefault();
          const matched = await processBarcodeScan(searchTerm);
          if (!matched) {
            showAlert(`No product matched barcode/SKU: "${searchTerm}"`, 'Product Not Found', 'warning');
          }
          return;
        }

        if (barcodeBuffer.length >= 2) {
          e.preventDefault();
          const matched = await processBarcodeScan(barcodeBuffer);
          if (!matched && !isInput) {
            showAlert(`No product matched scanned barcode: "${barcodeBuffer}"`, 'Product Not Found', 'warning');
          }
          barcodeBuffer = '';
          return;
        }
      }

      // Hardware Barcode Scanners transmit characters rapidly (<50ms apart)
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 80) {
        barcodeBuffer = ''; // Reset buffer if manually typed by human (>80ms delay)
      }
      lastKeyTime = currentTime;

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, searchTerm, cart]);

  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);

  const refreshCatalog = async () => {
    if (!token) return;
    try {
      setIsRefreshingCatalog(true);
      const [prodRes, catRes, custRes, settingsRes] = await Promise.all([
        api.get('/products?limit=500&inStockOnly=true'),
        api.get('/products/categories'),
        api.get('/customers?limit=200'),
        api.get('/settings'),
      ]);
      
      setProducts(prodRes.data.items || []);
      setCategories(catRes.data || []);
      setCustomers(custRes.data.items || []);
      setStoreSettings(settingsRes.data || null);

      // Prepopulate Narayan Chhetri customer if exists for visual demonstration matches
      const narayan = (custRes.data.items || []).find((c: any) => c.name.toLowerCase().includes('narayan'));
      if (narayan && !selectedCustomerId) {
        setSelectedCustomerId(narayan.id);
      }
    } catch (err) {
      console.error('Error fetching POS dependencies:', err);
    } finally {
      setIsRefreshingCatalog(false);
    }
  };

  // Load catalogs on mount
  useEffect(() => {
    refreshCatalog();
  }, [token]);

  // Add Item to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showAlert(`"${product.name}" is out of stock!`, 'Out of Stock', 'warning');
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (product.stock < currentQty + 1) {
        showAlert(`Insufficient stock. Only ${formatStock(product.stock)} units available.`, 'Insufficient Stock', 'warning');
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
  const recalculateCartItem = (item: CartItem, currentSettings = storeSettings) => {
    const subtotal = item.price * item.quantity;
    const globalTaxRate = currentSettings?.taxRateDefault || 0;
    // Only apply tax if global tax is set > 0. Use product tax if available, else global tax.
    const taxRate = globalTaxRate > 0 ? (item.product.taxRate || globalTaxRate) : 0;
    item.taxAmount = subtotal * (taxRate / 100);
    item.total = subtotal + item.taxAmount;
  };

  // Cart Adjustments
  const adjustQuantity = (productId: number, amount: number) => {
    const existingIndex = cart.findIndex((item) => item.product.id === productId);
    if (existingIndex === -1) return;

    const newCart = [...cart];
    const item = newCart[existingIndex];
    
    if (item.selectedUnit && item.conversionFactor) {
      const currentSecondary = Number(item.selectedUnitQuantity || 0);
      item.selectedUnitQuantity = currentSecondary + amount;
      item.quantity = item.selectedUnitQuantity / item.conversionFactor;
    } else {
      item.quantity += amount;
    }

    if (item.quantity <= 0) {
      newCart.splice(existingIndex, 1);
    } else {
      if (item.product.stock < item.quantity) {
        showAlert(`Insufficient stock. Only ${formatStock(item.product.stock)} units available.`, 'Insufficient Stock', 'warning');
        return;
      }
      recalculateCartItem(item);
    }
    setCart(newCart);
  };

  const setQuantity = (productId: number, val: string, isBaseUnit: boolean = true) => {
    const existingIndex = cart.findIndex((item) => item.product.id === productId);
    if (existingIndex === -1) return;

    const newCart = [...cart];
    const item = newCart[existingIndex];
    
    if (val === '') {
      if (isBaseUnit) {
        item.quantity = '' as any;
      } else {
        item.selectedUnitQuantity = '' as any;
      }
      setCart(newCart);
      return;
    }

    let targetQty = parseFloat(val);
    if (isNaN(targetQty)) return;

    if (targetQty <= 0) {
      newCart.splice(existingIndex, 1);
    } else {
      if (!isBaseUnit && item.conversionFactor) {
        item.selectedUnitQuantity = targetQty;
        item.quantity = targetQty / item.conversionFactor;
      } else {
        item.quantity = targetQty;
      }

      if (item.product.stock < item.quantity) {
        showAlert(`Insufficient stock. Only ${formatStock(item.product.stock)} units available.`, 'Insufficient Stock', 'warning');
        item.quantity = item.product.stock;
        if (!isBaseUnit && item.conversionFactor) {
          item.selectedUnitQuantity = item.quantity * item.conversionFactor;
        }
      }
      recalculateCartItem(item);
    }
    setCart(newCart);
  };

  const setUnit = (productId: number, unitName: string) => {
    const existingIndex = cart.findIndex((item) => item.product.id === productId);
    if (existingIndex === -1) return;
    const newCart = [...cart];
    const item = newCart[existingIndex];

    if (!unitName) {
      item.selectedUnit = undefined;
      item.selectedUnitQuantity = undefined;
      item.conversionFactor = undefined;
    } else {
      const conversion = item.product.unitConversions?.find(u => u.secondaryUnit === unitName);
      if (conversion) {
        item.selectedUnit = conversion.secondaryUnit;
        item.conversionFactor = conversion.conversionFactor;
        item.selectedUnitQuantity = item.quantity * conversion.conversionFactor;
      }
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
      showAlert('Cart is empty!', 'Empty Cart', 'info');
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
          saleUnit: item.selectedUnit,
          saleUnitQuantity: item.selectedUnitQuantity,
        })),
      };

      let res;
      if (paymentMethod === 'ONLINE') {
        // Hit Payment Gateway
        res = await api.post('/payments/process', {
          provider: 'MOCK_GATEWAY',
          amount: getNetPayable(),
          saleDto: payload
        });
        setCheckoutResult(res.data.sale);
      } else {
        // Normal Checkout
        res = await api.post('/sales/checkout', payload);
        setCheckoutResult(res.data);
      }
      
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
      showAlert(err.response?.data?.message || t('common', 'error'), 'Checkout Failed', 'error');
    }
  };

  const handlePrintReceipt = () => {
    printThermalReceipt('printable-receipt-modal', storeSettings?.printCopies || 2);
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
      showAlert('Error generating PDF file.', 'Download Error', 'error');
    }
  };

  // Filter logic: Only display products with active stock (> 0)
  const filteredProducts = products.filter((p) => {
    if (!p.stock || p.stock <= 0) return false;
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
                ref={searchInputRef}
                type="text"
                className="form-control border-0 bg-transparent py-2.5 shadow-none"
                placeholder={t('pos', 'search_product') || 'Scan barcode (Smart HC-6052) or search product/SKU...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ outline: 'none' }}
              />
              <button 
                className="btn btn-primary px-4 py-2 border-0 fw-bold" 
                style={{ backgroundColor: '#0d6efd', borderRadius: '0px' }}
                onClick={async () => {
                  if (searchTerm) {
                    const matched = await processBarcodeScan(searchTerm);
                    if (!matched) {
                      showAlert(`No product matched: "${searchTerm}"`, 'Product Not Found', 'warning');
                    }
                  }
                }}
              >
                {t('common', 'search') || 'Search'}
              </button>
            </div>

            {/* Quick Refresh Catalog Button */}
            <button
              className="btn btn-outline-secondary px-3 d-flex align-items-center justify-content-center border shadow-sm"
              style={{ borderRadius: '6px', backgroundColor: 'var(--light-card)' }}
              type="button"
              onClick={() => refreshCatalog()}
              title="Refresh Products & Stock from Server"
              disabled={isRefreshingCatalog}
            >
              <i className={`bi bi-arrow-clockwise text-primary fs-5 ${isRefreshingCatalog ? 'spin-animation' : ''}`}></i>
            </button>
            
            {/* Shift Register Control Button */}
            {currentShift ? (
              <button
                className="btn btn-outline-success px-3 d-flex align-items-center gap-2 border fw-semibold shadow-sm"
                onClick={() => {
                  setShiftMode('CLOSE');
                  setReconciliationSummary(null);
                  setShowShiftModal(true);
                }}
                title="Active Cash Register Shift - Click to Close Shift & Reconcile"
              >
                <i className="bi bi-cash-stack text-success fs-5"></i>
                <span className="d-none d-md-inline">Shift Active (Float: Rs. {currentShift.cashStart})</span>
                <span className="badge bg-success text-white">Close Shift</span>
              </button>
            ) : (
              <button
                className="btn btn-warning px-3 d-flex align-items-center gap-2 border fw-semibold shadow-sm text-dark"
                onClick={() => {
                  setShiftMode('START');
                  setReconciliationSummary(null);
                  setShowShiftModal(true);
                }}
                title="Start Cashier Shift & Set Opening Cash Float"
              >
                <i className="bi bi-door-open-fill text-dark fs-5"></i>
                <span>Open Shift Float</span>
              </button>
            )}

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
                <p>{t('pos', 'no_products') || 'No products match selected search parameters'}</p>
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
                    <div className="text-secondary fw-medium" style={{ fontSize: '0.75rem' }}>
                      {t('pos', 'stock') || 'Stock'}: <strong className="text-dark">{formatStock(prod.stock)}</strong> {prod.unit || ''}
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
              <h5 className="fw-bold text-dark m-0">{t('pos', 'current_order') || 'Current Order'}</h5>
            </div>

            {/* Customer select */}
            <div className="mb-3 d-flex gap-2 align-items-center">
              <SearchableCustomerSelect
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setSelectedCustomerId}
              />
              <button
                className="btn btn-outline-primary d-flex align-items-center justify-content-center flex-shrink-0"
                type="button"
                data-bs-toggle="modal"
                data-bs-target="#newCustomerModal"
                style={{ borderRadius: '8px', width: '42px', height: '40px' }}
                title="Add New Customer"
              >
                <i className="bi bi-person-plus-fill"></i>
              </button>
            </div>

            {/* Cart Body: Cart items list */}
            <div className="pos-cart-items-list mb-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 460px)', minHeight: '220px' }}>
              {cart.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                  <i className="bi bi-cart-x fs-1 mb-2 text-secondary"></i>
                  <p style={{ fontSize: '0.9rem' }}>{t('pos', 'cart_empty') || 'Cart is currently empty. Click on a product to add it!'}</p>
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

                    <div className="d-flex align-items-center mx-2 flex-wrap justify-content-center" style={{ maxWidth: '140px' }}>
                      <div className="d-flex w-100 mb-1 justify-content-center">
                        <button 
                          className="btn btn-sm btn-light border px-2 py-0.5" 
                          style={{ borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px', borderRight: 'none' }}
                          onClick={() => adjustQuantity(item.product.id, -1)}
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          className="form-control text-center py-0.5 bg-white px-1 no-spinners" 
                          value={item.selectedUnit ? item.selectedUnitQuantity : item.quantity} 
                          onChange={(e) => setQuantity(item.product.id, e.target.value, !item.selectedUnit)}
                          onBlur={() => {
                            if (item.selectedUnit ? !item.selectedUnitQuantity : !item.quantity) setQuantity(item.product.id, '1', !item.selectedUnit);
                          }}
                          style={{ width: '55px', border: '1px solid #dee2e6', borderRadius: '0px', fontSize: '0.85rem', height: '26px' }} 
                        />
                        <button 
                          className="btn btn-sm btn-light border px-2 py-0.5" 
                          style={{ borderTopRightRadius: '4px', borderBottomRightRadius: '4px', borderLeft: 'none' }}
                          onClick={() => adjustQuantity(item.product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      
                      {item.product.unitConversions && item.product.unitConversions.length > 0 && (
                        <select
                          className="form-select form-select-sm px-1 py-0"
                          style={{ fontSize: '0.75rem', height: '22px', maxWidth: '100px' }}
                          value={item.selectedUnit || ''}
                          onChange={(e) => setUnit(item.product.id, e.target.value)}
                        >
                          <option value="">Base Unit</option>
                          {item.product.unitConversions.map((uc) => (
                            <option key={uc.id} value={uc.secondaryUnit}>
                              {uc.secondaryUnit}
                            </option>
                          ))}
                        </select>
                      )}
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
                <span>{t('pos', 'total_items') || 'Total Items'}:</span>
                <span className="fw-bold text-dark">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-secondary fs-7">
                <span>{t('pos', 'sub_total') || 'Sub Total'}:</span>
                <span className="fw-bold text-dark">Rs.{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 align-items-center text-secondary fs-7">
                <span>{t('pos', 'discount') || 'Discount'}:</span>
                <input
                  type="number" min="0" step="any"
                  className="form-control form-control-sm text-end"
                  placeholder="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  style={{ width: '85px', borderRadius: '6px', backgroundColor: 'var(--light-bg)', border: '1px solid #dee2e6' }}
                />
              </div>
              
              <div className="border-top my-2"></div>

              <div className="d-flex justify-content-between mb-3 fw-bold fs-5">
                <span className="text-primary">{t('pos', 'grand_total') || 'Grand Total'}:</span>
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
                  <option value="CASH">{t('pos', 'cash') || 'Cash'}</option>
                  <option value="CARD">{t('pos', 'card') || 'Card'}</option>
                  <option value="QR">{t('pos', 'qr') || 'QR'}</option>
                  <option value="ONLINE">Pay Online (Gateway)</option>
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
                <span>{t('pos', 'pay_now') || 'Pay Now'}</span>
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
                <i className="bi bi-person-plus-fill me-2"></i>{t('pos', 'register_customer') || 'Register Quick CRM Customer'}
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
                <button type="button" className="btn btn-light border rounded-md" data-bs-dismiss="modal">{t('common', 'cancel')}</button>
                <button type="submit" className="btn btn-primary rounded-md">{t('common', 'save') || 'Save Customer'}</button>
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
                    {storeSettings?.storeName || 'KOSELIGHAR POS'}
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
                <table className="w-100 font-mono" style={{ fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '27%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #666' }}>
                      <th align="left" style={{ paddingBottom: '4px', paddingRight: '4px' }}>Item</th>
                      <th align="right" style={{ paddingBottom: '4px', paddingRight: '4px' }}>Rate</th>
                      <th align="center" style={{ paddingBottom: '4px' }}>Qty</th>
                      <th align="right" style={{ paddingBottom: '4px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkoutResult?.items?.map((item: any, idx: number) => (
                      <tr key={idx} style={{ verticalAlign: 'top' }}>
                        <td style={{ paddingTop: '3px', paddingBottom: '3px', paddingRight: '4px', wordBreak: 'break-word' }}>{item.product?.name}</td>
                        <td align="right" style={{ paddingTop: '3px', paddingBottom: '3px', paddingRight: '4px', whiteSpace: 'nowrap' }}>Rs. {Number(item.price ?? item.unitPrice ?? (Number(item.total) / item.quantity)).toFixed(2)}</td>
                        <td align="center" style={{ paddingTop: '3px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>x{item.quantity}</td>
                        <td align="right" style={{ paddingTop: '3px', paddingBottom: '3px', whiteSpace: 'nowrap' }}>Rs. {Number(item.total).toFixed(2)}</td>
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
      {/* ==========================================
          SHIFT REGISTER MODAL (OPEN / CLOSE SHIFT)
          ========================================== */}
      {showShiftModal && (
        <div className="modal d-block tab-active" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg" style={{ backgroundColor: 'var(--light-card)' }}>
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className={`bi ${shiftMode === 'START' ? 'bi-door-open-fill text-warning' : 'bi-cash-register text-primary'}`}></i>
                  {shiftMode === 'START' ? 'Start Shift (Opening Cash Float)' : 'Close Shift & Drawer Reconciliation'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowShiftModal(false)}></button>
              </div>

              {shiftMode === 'START' ? (
                <form onSubmit={handleStartShiftSubmit}>
                  <div className="modal-body p-4">
                    <p className="text-muted small mb-3">
                      Enter the initial cash float handed to you at the beginning of your cashier counter shift.
                    </p>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Opening Cash Float (Rs.)</label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text bg-light fw-bold">Rs.</span>
                        <input
                          type="number"
                          className="form-control fw-bold"
                          value={openingFloat}
                          onChange={(e) => setOpeningFloat(Number(e.target.value))}
                          min="0"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top p-3">
                    <button type="button" className="btn btn-light" onClick={() => setShowShiftModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-warning px-4 fw-bold text-dark" disabled={submittingShift}>
                      {submittingShift ? 'Opening...' : 'Start Shift'}
                    </button>
                  </div>
                </form>
              ) : reconciliationSummary ? (
                <div className="modal-body p-4 text-center">
                  <div className={`p-3 rounded-3 mb-3 ${reconciliationSummary.isBalanced ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-dark border border-warning'}`}>
                    <i className={`bi ${reconciliationSummary.isBalanced ? 'bi-check-circle-fill fs-1' : 'bi-exclamation-triangle-fill fs-1'}`}></i>
                    <h5 className="fw-bold mt-2">
                      {reconciliationSummary.isBalanced ? 'Register Shift Balanced Cleanly!' : 'Shift Closed with Cash Variance'}
                    </h5>
                  </div>

                  <div className="table-responsive text-start mb-3">
                    <table className="table table-bordered">
                      <tbody>
                        <tr>
                          <td className="fw-semibold">Opening Float:</td>
                          <td className="text-end fw-bold">Rs. {Number(reconciliationSummary.cashStart).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="fw-semibold">Total Cash Sales Collected:</td>
                          <td className="text-end fw-bold text-success">+Rs. {Number(reconciliationSummary.totalCashSales).toFixed(2)}</td>
                        </tr>
                        <tr className="table-light">
                          <td className="fw-bold">Expected Drawer Cash:</td>
                          <td className="text-end fw-bold">Rs. {Number(reconciliationSummary.expectedCash).toFixed(2)}</td>
                        </tr>
                        <tr className="table-light">
                          <td className="fw-bold">Actual Counted Cash:</td>
                          <td className="text-end fw-bold">Rs. {Number(reconciliationSummary.actualCountedCash).toFixed(2)}</td>
                        </tr>
                        <tr className={reconciliationSummary.variance === 0 ? 'table-success' : reconciliationSummary.variance > 0 ? 'table-info' : 'table-danger'}>
                          <td className="fw-bold">Variance (Shortage / Over):</td>
                          <td className="text-end fw-bold">
                            {reconciliationSummary.variance >= 0 ? `+Rs. ${reconciliationSummary.variance.toFixed(2)}` : `-Rs. ${Math.abs(reconciliationSummary.variance).toFixed(2)}`}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <button className="btn btn-primary px-4 fw-bold w-100" onClick={() => setShowShiftModal(false)}>
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCloseShiftSubmit}>
                  <div className="modal-body p-4">
                    <div className="alert alert-info py-2 small mb-3">
                      <strong>Active Shift Started At:</strong> {currentShift?.startTime ? new Date(currentShift.startTime).toLocaleTimeString() : 'N/A'}<br />
                      <strong>Opening Float:</strong> Rs. {currentShift?.cashStart || 0}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Counted Physical Drawer Cash (Rs.)</label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text bg-light fw-bold">Rs.</span>
                        <input
                          type="number"
                          className="form-control fw-bold"
                          value={closingCount}
                          onChange={(e) => setClosingCount(Number(e.target.value))}
                          min="0"
                          required
                          autoFocus
                          placeholder="Count cash in drawer..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top p-3">
                    <button type="button" className="btn btn-light" onClick={() => setShowShiftModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-danger px-4 fw-bold" disabled={submittingShift}>
                      {submittingShift ? 'Closing...' : 'Close Shift & Reconcile'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
