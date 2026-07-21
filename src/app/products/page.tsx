'use client';

import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import * as XLSX from 'xlsx';

interface Category {
  id: number;
  name: string;
  description?: string;
  _count?: { products: number };
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  status: string;
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
  categoryId: number;
  category: Category;
  brandId?: number;
  brand?: Brand;
  unit: string;
  description?: string;
}

export default function ProductsPage() {
  const { user, token, api } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';

  // Catalogs
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedProductForView, setSelectedProductForView] = useState<any>(null);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(1);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  // Edit / Add states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Excel Import ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Product Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | string>('');
  const [sellingPrice, setSellingPrice] = useState<number | string>('');
  const [stockQty, setStockQty] = useState<number | string>('');
  const [alertQty, setAlertQty] = useState<number | string>(5);
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '', description: ''
  });

  // Load items
  const loadCatalogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const catUrl = categoryId ? `&categoryId=${categoryId}` : '';
      const [prodRes, categoriesRes, brandsRes] = await Promise.all([
        api.get(`/products?page=${page}&limit=10&search=${search}${catUrl}`),
        api.get('/products/categories'),
        api.get('/brands')
      ]);
      setProducts(prodRes.data.items || []);
      setTotalPages(prodRes.data.totalPages || 1);
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
    } catch (err) {
      console.error('Error fetching catalog data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCatalogs();
  }, [token, page, search, categoryId]);

  // Handle Product CRUD
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators can alter the product catalog');
      return;
    }

    const payload = {
      name,
      SKU: sku,
      barcode: barcode || sku, // fallback to SKU for barcodes
      price: Number(sellingPrice),
      cost: Number(purchasePrice),
      stock: Number(stockQty),
      minStockAlert: Number(alertQty),
      categoryId: Number(selectedCategory),
      brandId: selectedBrand ? Number(selectedBrand) : null,
      taxRate: 13.0, // default Nepal VAT rate
      unit,
      description
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        alert('Product successfully updated!');
      } else {
        await api.post('/products', payload);
        alert('Product successfully created!');
      }
      
      // Reset Product Form
      setName('');
      setSku('');
      setUnit('pcs');
      setSelectedCategory('');
      setSelectedBrand('');
      setPurchasePrice('');
      setSellingPrice('');
      setStockQty('');
      setAlertQty(5);
      setDescription('');
      setBarcode('');
      setEditingProduct(null);

      // Close modal
      const modalElement = document.getElementById('productModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadCatalogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing product');
    }
  };

  
  const handleViewProduct = (prod: any) => {
    setSelectedProductForView(prod);
    const modalElement = document.getElementById('viewProductModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handlePrintBarcode = (prod: any) => {
    setSelectedProductForBarcode(prod);
    const modalElement = document.getElementById('printBarcodeModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const printBarcodeNow = () => {
    window.print();
  };

  const handleEditProductClick = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.SKU);
    setUnit(prod.unit || 'pcs');
    setSelectedCategory(String(prod.categoryId));
    setSelectedBrand(prod.brandId ? String(prod.brandId) : '');
    setPurchasePrice(prod.cost);
    setSellingPrice(prod.price);
    setStockQty(prod.stock);
    setAlertQty(prod.minStockAlert);
    setDescription(prod.description || '');
    setBarcode(prod.barcode || '');

    // Open modal
    const modalElement = document.getElementById('productModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      alert('Product deleted successfully');
      loadCatalogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot delete product with active sales history');
    }
  };

  // Handle Category CRUD
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingCategory) {
        await api.put(`/products/categories/${editingCategory.id}`, categoryForm);
        alert('Category updated!');
      } else {
        await api.post('/products/categories', categoryForm);
        alert('Category created!');
      }
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);

      // Close modal
      const modalElement = document.getElementById('categoryModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadCatalogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing category');
    }
  };

  const handleEditCategoryClick = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
    });
    
    // Open modal
    const modalElement = document.getElementById('categoryModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/products/categories/${id}`);
      alert('Category deleted successfully');
      loadCatalogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot delete category containing products');
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(products.map(p => ({
      ID: p.id,
      Name: p.name,
      SKU: p.SKU,
      Barcode: p.barcode,
      Category: p.category?.name || '',
      Brand: p.brand?.name || '',
      'Cost Price': p.cost,
      'Selling Price': p.price,
      Stock: p.stock,
      'Alert Qty': p.minStockAlert,
      Unit: p.unit
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "Products.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      alert('Only administrators can import products');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet);

        if (parsedData.length === 0) {
          alert('Excel file is empty');
          return;
        }

        // Loop through each item and create product
        for (const item of parsedData as any[]) {
          const payload = {
            name: item.Name,
            SKU: item.SKU,
            barcode: item.Barcode || item.SKU,
            price: Number(item['Selling Price']),
            cost: Number(item['Cost Price']),
            stock: Number(item.Stock || 0),
            minStockAlert: Number(item['Alert Qty'] || 5),
            categoryId: categories.find(c => c.name === item.Category)?.id || (categories[0]?.id || 1),
            brandId: brands.find(b => b.name === item.Brand)?.id || null,
            taxRate: 13.0,
            unit: item.Unit || 'pcs',
            description: ''
          };

          await api.post('/products', payload);
        }

        alert('Products imported successfully!');
        loadCatalogs();
      } catch (err: any) {
        console.error(err);
        alert('Error importing products. Ensure formatting is correct.');
      }
      
      // reset file input
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleAddProductClick = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setUnit('pcs');
    setSelectedCategory(categories[0]?.id ? String(categories[0].id) : '');
    setSelectedBrand('');
    setPurchasePrice('');
    setSellingPrice('');
    setStockQty('');
    setAlertQty(5);
    setDescription('');
    setBarcode('');

    const modalElement = document.getElementById('productModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  return (
    <AuthLayout>
      {/* Tab Selectors */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <ul className="nav nav-pills border-0 bg-white p-1 rounded-pill shadow-sm" style={{ border: '1px solid var(--border-color)' }}>
          <li className="nav-item">
            <button
              className={`nav-link rounded-pill fw-bold px-4 py-2 ${activeTab === 'products' ? 'active bg-primary' : 'text-secondary'}`}
              onClick={() => setActiveTab('products')}
            >
              <i className="bi bi-box-seam me-2"></i>{t('product', 'title')}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link rounded-pill fw-bold px-4 py-2 ${activeTab === 'categories' ? 'active bg-primary' : 'text-secondary'}`}
              onClick={() => setActiveTab('categories')}
            >
              <i className="bi bi-tags me-2"></i>{t('product', 'categories')}
            </button>
          </li>
        </ul>

        {/* Add triggers */}
        {isAdmin && (
          <div>
            {activeTab === 'products' ? (
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-success d-flex align-items-center gap-2 fw-bold px-3 py-2"
                  style={{ borderRadius: '20px' }}
                  onClick={handleExportExcel}
                  title="Export Products"
                >
                  <i className="bi bi-file-earmark-excel"></i>
                  <span>{t('common', 'export')}</span>
                </button>
                <button
                  className="btn btn-outline-success d-flex align-items-center gap-2 fw-bold px-3 py-2"
                  style={{ borderRadius: '20px' }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Import Products"
                >
                  <i className="bi bi-upload"></i>
                  <span>{t('common', 'add')}</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".xlsx, .xls" 
                  onChange={handleImportExcel} 
                />
                <button
                  className="btn btn-primary d-flex align-items-center gap-2 fw-bold px-3 py-2"
                  style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }}
                  onClick={handleAddProductClick}
                >
                  <i className="bi bi-plus-circle"></i>
                  <span>{t('product', 'add_product')}</span>
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary d-flex align-items-center gap-2 fw-bold px-3 py-2"
                style={{ backgroundColor: '#0d6efd', borderRadius: '20px' }}
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '' });
                  const modalElement = document.getElementById('categoryModal');
                  if (modalElement) {
                    const bootstrap = require('bootstrap');
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                  }
                }}
              >
                <i className="bi bi-plus-circle"></i>
                  <span>{t('product', 'add_category')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ==========================================
          TAB 1: PRODUCTS DISPLAY
          ========================================== */}
      {activeTab === 'products' && (
        <div className="card border-none rounded-lg p-4 shadow-sm" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
          
          {/* Filters Bar */}
          <div className="row g-3 align-items-center mb-4">
            <div className="col-12 col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder={t('common', 'search')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
              >
                <option value="">{t('common', 'all')} {t('common', 'category')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                  <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top" style={{ width: '10%' }}>{t('common', 'sku')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '25%' }}>{t('common', 'name')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-end" style={{ width: '12%' }}>Selling Price</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>Stock Qty</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '10%' }}>Alert Qty</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top" style={{ width: '13%' }}>{t('common', 'status')}</th>
                  {isAdmin && <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center" style={{ width: '20%' }}>{t('common', 'actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-5 text-muted">{t('common', 'loading')}</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-5 text-muted">{t('product', 'no_products')}</td>
                  </tr>
                ) : (
                  products.map((prod) => (
                    <tr key={prod.id}>
                      <td className="ps-3 border-bottom py-3 font-mono fw-bold" style={{ color: '#ec4899' }}>
                        {prod.SKU}
                      </td>
                      <td className="border-bottom fw-bold text-dark">
                        {prod.name}
                      </td>
                      <td className="border-bottom text-end pe-3">
                        <span className="fw-semibold" style={{ color: 'var(--primary)' }}>
                          Rs. {prod.price?.toLocaleString() ?? '—'}
                        </span>
                      </td>
                      <td className="border-bottom text-center">
                        <span className={`badge ${ (prod.stock ?? 0) <= (prod.minStockAlert ?? 0) ? 'bg-danger' : 'bg-primary-subtle text-primary border border-primary-subtle' }`} style={{ borderRadius: '6px', fontSize: '12px' }}>
                          {prod.stock ?? 0}
                        </span>
                      </td>
                      <td className="border-bottom text-center">
                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle" style={{ borderRadius: '6px', fontSize: '12px' }}>
                          {prod.minStockAlert ?? '—'}
                        </span>
                      </td>
                      <td className="border-bottom">
                        <span className="badge bg-success" style={{ borderRadius: '4px', fontSize: '11px' }}>
                          {t('common', 'active')}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="border-bottom text-center">
                          <div className="d-flex justify-content-center gap-2">
                            {/* Barcode scanner outlined button */}
                            <button className="btn btn-sm btn-outline-secondary p-1 px-2 d-flex align-items-center" style={{ borderColor: '#6c757d', color: 'var(--text-dark)' }} title="Print Barcode" onClick={() => handlePrintBarcode(prod)}>
                              <i className="bi bi-qr-code-scan"></i>
                            </button>
                            {/* Edit outlined button */}
                            <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEditProductClick(prod)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                              <i className="bi bi-pencil-fill"></i>
                            </button>
                            {/* Toggle status outlined button */}
                            <button className="btn btn-sm btn-outline-warning p-1 px-2 d-flex align-items-center" style={{ borderColor: '#ffc107', color: '#e0a800' }} title="View Details" onClick={() => handleViewProduct(prod)}>
                              <i className="bi bi-eye-fill"></i>
                            </button>
                            {/* Delete outlined button */}
                            <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDeleteProduct(prod.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <span className="text-muted fs-7">Showing page {page} of {totalPages}</span>
              <div className="btn-group">
                <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          TAB 2: CATEGORIES DISPLAY
          ========================================== */}
      {activeTab === 'categories' && (
        <div className="card border-none rounded-lg p-4 shadow-sm" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                  <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top">Category Name</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Description</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Products Count</th>
                  {isAdmin && <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="text-center py-4 text-muted">No categories created in the system</td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="fw-bold text-dark">{cat.name}</td>
                      <td className="text-muted">{cat.description || 'No description provided'}</td>
                      <td><span className="badge bg-primary rounded-pill">{cat._count?.products || 0} items</span></td>
                      {isAdmin && (
                        <td>
                          <div className="d-flex justify-content-center gap-2">
                            <button className="btn btn-sm btn-outline-info p-1 px-2 d-flex align-items-center" onClick={() => handleEditCategoryClick(cat)} style={{ borderColor: '#0dcaf0', color: '#0dcaf0' }}>
                              <i className="bi bi-pencil-fill"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger p-1 px-2 d-flex align-items-center" onClick={() => handleDeleteCategory(cat.id)} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 1: ADD/EDIT PRODUCT MODAL
          ========================================== */}
      <div className="modal fade text-dark" id="productModal" tabIndex={-1} aria-labelledby="productModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h5 className="modal-title fw-bold text-dark m-0" id="productModalLabel" style={{ fontSize: '1.1rem' }}>
                <span className="text-primary me-2"><i className="bi bi-plus-circle"></i></span>
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body p-4 bg-white">
                {/* Row 1 */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-5">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">SKU <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Unit</label>
                    <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
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
                  </div>
                </div>

                {/* Row 2 */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Category <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Brand</label>
                    <select
                      className="form-select"
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                    >
                      <option value="">-- No Brand --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Barcode</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Scan or enter"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                      />
                      <button 
                        className="btn btn-outline-secondary" 
                        type="button" 
                        onClick={() => {
                          const newBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
                          setBarcode(newBarcode);
                        }}
                        title="Generate Barcode"
                      >
                        <i className="bi bi-magic"></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="row g-3 mb-3">
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Purchase Price <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-secondary border-end-0" style={{ fontSize: '0.9rem' }}>Rs.</span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control border-start-0 ps-1"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Selling Price <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-secondary border-end-0" style={{ fontSize: '0.9rem' }}>Rs.</span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control border-start-0 ps-1"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Stock Qty <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                      disabled={!!editingProduct}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Alert Qty</label>
                    <input
                      type="number"
                      className="form-control"
                      value={alertQty}
                      onChange={(e) => setAlertQty(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Row 4 */}
                <div className="mb-3">
                  <label className="form-label fw-bold text-secondary fs-8 mb-1">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer border-top p-3 bg-white d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary px-4 py-2 fw-semibold" data-bs-dismiss="modal" style={{ borderRadius: '6px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold" style={{ backgroundColor: '#0066ff', border: 'none', borderRadius: '20px' }}>Save Product</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL 2: ADD/EDIT CATEGORY MODAL
          ========================================== */}
      <div className="modal fade text-dark" id="categoryModal" tabIndex={-1} aria-labelledby="categoryModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-lg">
            <div className="modal-header bg-primary text-white border-none p-3.5">
              <h5 className="modal-title fw-bold" id="categoryModalLabel">
                <i className="bi bi-tag-fill me-2"></i>{editingCategory ? 'Edit Product Category' : 'Register Product Category'}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Household Groceries"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Brief Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe product category contents..."
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer border-top p-3">
                <button type="button" className="btn btn-light rounded-md" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary rounded-md">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    
      {/* ==========================================
          MODAL: VIEW PRODUCT DETAILS
          ========================================== */}
      <div className="modal fade text-dark" id="viewProductModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
            <div className="modal-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
              <h5 className="modal-title fw-bold"><i className="bi bi-box-seam me-2 text-primary"></i> Product Details</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4">
              {selectedProductForView && (
                <div className="row g-3">
                  <div className="col-12 text-center mb-3">
                    <h4 className="fw-bold text-dark">{selectedProductForView.name}</h4>
                    <span className="badge bg-success">Active</span>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">SKU</p>
                    <p className="fw-bold">{selectedProductForView.SKU}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">Barcode</p>
                    <p className="fw-bold">{selectedProductForView.barcode || 'N/A'}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">Category</p>
                    <p className="fw-bold">{selectedProductForView.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">Brand</p>
                    <p className="fw-bold">{selectedProductForView.brand?.name || 'No Brand'}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">Cost Price</p>
                    <p className="fw-bold text-danger">Rs. {selectedProductForView.cost.toFixed(2)}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">Selling Price</p>
                    <p className="fw-bold text-success">Rs. {selectedProductForView.price.toFixed(2)}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">Current Stock</p>
                    <p className="fw-bold">{selectedProductForView.stock} {selectedProductForView.unit}</p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted mb-1 fs-8">Tax Rate</p>
                    <p className="fw-bold">{selectedProductForView.taxRate}%</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer border-0 p-3 bg-light">
              <button type="button" className="btn btn-secondary btn-sm rounded-md" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL: PRINT BARCODE
          ========================================== */}
      <div className="modal fade text-dark" id="printBarcodeModal" tabIndex={-1} aria-hidden="true" data-bs-backdrop="static">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
            <div className="modal-header bg-dark text-white border-0 p-3 no-print">
              <h5 className="modal-title fw-bold"><i className="bi bi-qr-code-scan me-2 text-warning"></i> Print Barcode</h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4 text-center">
              
              <div id="printable-receipt-modal" className="thermal-receipt mx-auto d-flex flex-column align-items-center justify-content-center p-3" style={{ border: '1px dashed #ccc' }}>
                <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '14px' }}>{selectedProductForBarcode?.name}</h6>
                <p className="text-muted m-0 mb-2" style={{ fontSize: '11px' }}>{selectedProductForBarcode?.category?.name || ''}</p>
                
                {selectedProductForBarcode?.barcode ? (
                  <Barcode value={selectedProductForBarcode.barcode} width={2} height={50} fontSize={14} />
                ) : (
                  <Barcode value={selectedProductForBarcode?.SKU || 'UNKNOWN'} width={2} height={50} fontSize={14} />
                )}
                
                <h5 className="fw-bold mt-2" style={{ fontSize: '16px' }}>Rs. {selectedProductForBarcode?.price.toFixed(2)}</h5>
              </div>

            </div>
            <div className="modal-footer border-top p-3 no-print d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light btn-sm border" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary btn-sm rounded-md d-flex align-items-center gap-1" onClick={printBarcodeNow}>
                <i className="bi bi-printer-fill"></i> Print
              </button>
            </div>
          </div>
        </div>
      </div>

    </AuthLayout>
  );
}
