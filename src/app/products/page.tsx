'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Barcode from 'react-barcode';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useModal } from '@/context/ModalContext';
import * as XLSX from 'xlsx';
import TableControls, { applyPagination } from '@/components/TableControls';
import CascadingCategorySelect from '@/components/CascadingCategorySelect';

interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
  parentId?: number | null;
  parent?: { id: number; name: string };
  fullPath?: string;
  level?: number;
  children?: Category[];
  _count?: { products: number; children?: number };
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  status: string;
}

interface UnitConversion {
  id: number;
  baseUnit: string;
  secondaryUnit: string;
  conversionFactor: number;
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
  unitConversions?: UnitConversion[];
}

export default function ProductsPage() {
  const router = useRouter();
  const { user, token, api } = useAuth();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin';

  // Catalogs
  const [products, setProducts] = useState<Product[]>([]);
  const [allProductsForPrint, setAllProductsForPrint] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Super Admin specific state
  // Using global filter from Navbar, so no local company selection needed


  // Pagination & Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedProductForView, setSelectedProductForView] = useState<any>(null);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(1);

  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryRowsPerPage, setCategoryRowsPerPage] = useState(10);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [printMode, setPrintMode] = useState<'single' | 'bulk' | null>(null);

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
  const [stockQty, setStockQty] = useState<number | string>(0);
  const [alertQty, setAlertQty] = useState<number | string>(5);
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    description: string;
    parentId: number | null;
  }>({
    name: '',
    description: '',
    parentId: null,
  });
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);

  const [selectedProductForUnits, setSelectedProductForUnits] = useState<any>(null);
  const [ucFactor, setUcFactor] = useState('');
  const [ucSecondary, setUcSecondary] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const toggleCategoryExpand = (id: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Load items
  const loadCatalogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const catUrl = categoryId ? `&categoryId=${categoryId}` : '';
      const [prodRes, flatCatsRes, treeCatsRes, brandsRes, settingsRes] = await Promise.all([
        api.get(`/products?page=${page}&limit=${rowsPerPage}&search=${search}${catUrl}`),
        api.get(`/products/categories`),
        api.get(`/products/categories/tree`),
        api.get(`/brands`),
        api.get('/settings')
      ]);
      setProducts(prodRes.data.items || []);
      setTotalPages(prodRes.data.totalPages || 1);
      setTotalProducts(prodRes.data.total || 0);
      setCategories(flatCatsRes.data || []);
      setCategoryTree(treeCatsRes.data || []);
      setBrands(brandsRes.data || []);
      setStoreSettings(settingsRes.data || null);
    } catch (err) {
      console.error('Error fetching catalog data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCatalogs();
  }, [token, page, rowsPerPage, search, categoryId]);

  // Clean up print mode & modal backdrop on print/cancel
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-barcode-single');
      document.body.classList.remove('printing-bulk-barcode');
      document.body.classList.remove('printing-receipt');
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(b => b.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');
      setPrintMode(null);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Handle Product CRUD
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Only administrators can alter the product catalog', { type: 'warning', title: 'Access Denied' });
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
      taxRate: storeSettings?.taxRateDefault || 0,
      unit,
      description
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        showAlert('Product successfully updated!', { type: 'success', title: 'Updated' });
      } else {
        await api.post('/products', payload);
        showAlert('Product successfully created!', { type: 'success', title: 'Created' });
      }
      
      // Reset Product Form
      setName('');
      setSku('');
      setUnit('pcs');
      setSelectedCategory('');
      setSelectedBrand('');
      setPurchasePrice('');
      setSellingPrice('');
      setStockQty(0);
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
      showAlert(err.response?.data?.message || 'Error processing product', { type: 'danger', title: 'Error' });
    }
  };

  
  const handleManageUnits = (prod: any) => {
    setSelectedProductForUnits(prod);
    const modalElement = document.getElementById('unitConversionsModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleUnitConversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForUnits) return;
    try {
      await api.post('/unit-conversions', {
        productId: selectedProductForUnits.id,
        baseUnit: selectedProductForUnits.unit || 'pcs',
        secondaryUnit: ucSecondary,
        conversionFactor: Number(ucFactor),
      });
      showAlert('Conversion added successfully', { type: 'success', title: 'Success' });
      setUcFactor('');
      setUcSecondary('');
      
      const updatedProductRes = await api.get('/products/' + selectedProductForUnits.id);
      setSelectedProductForUnits(updatedProductRes.data);
      loadCatalogs();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Error adding unit conversion', { type: 'danger', title: 'Error' });
    }
  };

  const handleDeleteUnitConversion = async (id: number) => {
    showConfirm({
      title: 'Delete Conversion',
      message: 'Are you sure you want to delete this unit conversion?',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete('/unit-conversions/' + id);
          showAlert('Conversion deleted', { type: 'success', title: 'Deleted' });
          const updatedProductRes = await api.get('/products/' + selectedProductForUnits.id);
          setSelectedProductForUnits(updatedProductRes.data);
          loadCatalogs();
        } catch (err: any) {
          showAlert('Error deleting conversion', { type: 'danger', title: 'Error' });
        }
      },
    });
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
    // Hide modal cleanly first so backdrop is removed before print
    const modalElement = document.getElementById('printBarcodeModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
    }

    setPrintMode('single');
    document.body.classList.add('printing-barcode-single');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintAllBarcodes = async () => {
    try {
      const res = await api.get('/products?limit=1000');
      const fullCatalog = res.data.items || products;
      setAllProductsForPrint(fullCatalog);
    } catch {
      setAllProductsForPrint(products);
    }
    setPrintMode('bulk');
    document.body.classList.add('printing-bulk-barcode');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-bulk-barcode');
      setPrintMode(null);
    }, 200);
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
    showConfirm({
      title: 'Delete Product',
      message: 'Are you sure you want to permanently delete this product? This cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/products/${id}`);
          showAlert('Product deleted successfully', { type: 'success', title: 'Deleted' });
          loadCatalogs();
        } catch (err: any) {
          showAlert(err.response?.data?.message || 'Cannot delete product with active sales history', { type: 'danger', title: 'Error' });
        }
      },
    });
  };

  // Handle Category CRUD
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (categoryImageFile) {
        // Only use FormData when an image file is actually selected
        const formData = new FormData();
        formData.append('name', categoryForm.name);
        if (categoryForm.description) formData.append('description', categoryForm.description);
        if (categoryForm.parentId !== null && categoryForm.parentId !== undefined) {
          formData.append('parentId', String(categoryForm.parentId));
        }
        formData.append('image', categoryImageFile);

        if (editingCategory) {
          await api.put(`/products/categories/${editingCategory.id}`, formData);
        } else {
          await api.post('/products/categories', formData);
        }
      } else {
        // No image — send clean JSON (works perfectly with ValidationPipe)
        const payload: any = {
          name: categoryForm.name,
          ...(categoryForm.description ? { description: categoryForm.description } : {}),
          ...(categoryForm.parentId !== null && categoryForm.parentId !== undefined
            ? { parentId: categoryForm.parentId }
            : {}),
        };

        if (editingCategory) {
          await api.put(`/products/categories/${editingCategory.id}`, payload);
        } else {
          await api.post('/products/categories', payload);
        }
      }

      setCategoryForm({ name: '', description: '', parentId: null });
      setEditingCategory(null);
      setCategoryImageFile(null);
      setCategoryImagePreview(null);

      // Close modal
      const modalElement = document.getElementById('categoryModal');
      if (modalElement) {
        const bootstrap = require('bootstrap');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal?.hide();
      }

      loadCatalogs();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Error processing category', { type: 'danger', title: 'Error' });
    }
  };

  const handleAddSubCategoryClick = (parentCat: Category) => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', parentId: parentCat.id });
    setCategoryImageFile(null);
    setCategoryImagePreview(null);
    
    const modalElement = document.getElementById('categoryModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleEditCategoryClick = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', parentId: cat.parentId || null });
    setCategoryImageFile(null);
    // Show existing image as preview
    setCategoryImagePreview(cat.image ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/${cat.image}` : null);
    
    const modalElement = document.getElementById('categoryModal');
    if (modalElement) {
      const bootstrap = require('bootstrap');
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    showConfirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? All sub-categories must be removed first.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/products/categories/${id}`);
          showAlert('Category deleted successfully', { type: 'success', title: 'Deleted' });
          loadCatalogs();
        } catch (err: any) {
          showAlert(err.response?.data?.message || 'Cannot delete category containing products', { type: 'danger', title: 'Cannot Delete' });
        }
      },
    });
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
      showAlert('Only administrators can import products', { type: 'warning', title: 'Access Denied' });
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
          showAlert('Excel file is empty', { type: 'warning', title: 'Empty File' });
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
            taxRate: storeSettings?.taxRateDefault || 0,
            unit: item.Unit || 'pcs',
            description: ''
          };

          await api.post('/products', payload);
        }

        showAlert(`${parsedData.length} product(s) imported successfully!`, { type: 'success', title: 'Import Complete' });
        loadCatalogs();
      } catch (err: any) {
        console.error(err);
        showAlert('Error importing products. Ensure formatting is correct.', { type: 'danger', title: 'Import Failed' });
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
      {/* Back Button */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title="Go back">
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <h4 className="fw-bold m-0 text-dark">{t('product', 'title') || 'Products'}</h4>
      </div>
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
              <div className="d-flex gap-2 flex-wrap">
                <button
                  className="btn btn-outline-secondary d-flex align-items-center gap-2 fw-bold px-3 py-2"
                  style={{ borderRadius: '20px' }}
                  onClick={handlePrintAllBarcodes}
                  title="Print Current Barcodes"
                >
                  <i className="bi bi-upc-scan"></i>
                  <span>Print Barcodes</span>
                </button>
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
              <CascadingCategorySelect
                categories={categoryTree.length > 0 ? categoryTree : categories}
                value={categoryId}
                onChange={(val) => { setCategoryId(val ? String(val) : ''); setPage(1); }}
                placeholder="All Categories"
                allowClear
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr style={{ backgroundColor: 'var(--light-bg)' }}>
                  <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top">{t('common', 'sku')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">{t('common', 'name')}</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Selling Price</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Alert Qty</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">{t('common', 'status')}</th>
                  {isAdmin && <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center">{t('common', 'actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="text-center py-5 text-muted">{t('common', 'loading')}</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="text-center py-5 text-muted">{t('product', 'no_products')}</td>
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
                      <td className="border-bottom text-dark fw-bold">
                        Rs. {prod.price?.toLocaleString() || 0}
                      </td>
                      <td className="border-bottom text-danger fw-bold">
                        {prod.minStockAlert?.toLocaleString() || 0}
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
                            {/* Units button */}
                            <button className="btn btn-sm btn-outline-primary p-1 px-2 d-flex align-items-center" title="Manage Unit Conversions" onClick={() => handleManageUnits(prod)}>
                              <i className="bi bi-calculator"></i>
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

            <TableControls
              total={totalProducts}
              currentPage={page}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(1); }}
              onPageChange={setPage}
            />
          </div>


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
                  <th className="fw-bold text-dark py-3 ps-3 border-bottom-0 border-top">Category</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Level</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Description</th>
                  <th className="fw-bold text-dark py-3 border-bottom-0 border-top">Products</th>
                  {isAdmin && <th className="fw-bold text-dark py-3 border-bottom-0 border-top text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="text-center py-4 text-muted">No categories created in the system</td>
                  </tr>
                ) : (() => {
                  // Recursive row renderer — matches reference app pattern
                  const renderCategoryRow = (cat: Category, depth: number): React.ReactNode => {
                    const hasChildren = (cat.children?.length ?? 0) > 0;
                    const isExpanded = expandedCategories.has(cat.id);

                    return (
                      <React.Fragment key={cat.id}>
                        <tr
                          className="align-middle"
                          style={{
                            borderBottom: '1px solid var(--border-color, #dee2e6)',
                            backgroundColor: depth > 0 ? 'var(--light-bg, rgba(0,0,0,0.01))' : undefined,
                          }}
                        >
                          {/* Name cell with indent + connector */}
                          <td className="py-2 ps-3">
                            <div className="d-flex align-items-center" style={{ paddingLeft: depth * 24 }}>
                              {/* Horizontal connector line for children */}
                              {depth > 0 && (
                                <span style={{ width: 16, height: 1, backgroundColor: 'var(--border-color, #dee2e6)', flexShrink: 0, display: 'inline-block', marginRight: 4 }} />
                              )}
                              {/* Expand/collapse chevron */}
                              {hasChildren ? (
                                <button
                                  className="btn btn-link p-0 me-1 text-secondary"
                                  style={{ lineHeight: 1, minWidth: 16 }}
                                  onClick={() => toggleCategoryExpand(cat.id)}
                                  title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                  <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} fs-7`}></i>
                                </button>
                              ) : (
                                <span style={{ width: 20, display: 'inline-block', flexShrink: 0 }} />
                              )}
                              {/* Image or icon */}
                              {cat.image ? (
                                <img
                                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/${cat.image}`}
                                  alt={cat.name}
                                  className="me-2 flex-shrink-0"
                                  style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, border: '1px solid #dee2e6' }}
                                />
                              ) : (
                                <i className={`bi ${depth === 0 ? 'bi-folder-fill text-warning' : 'bi-folder2 text-secondary'} me-2 flex-shrink-0`}></i>
                              )}
                              {/* Name only — no full path */}
                              <span className={depth === 0 ? 'fw-semibold' : 'text-secondary'} style={{ fontSize: '0.9rem' }}>
                                {cat.name}
                              </span>
                              {/* Sub-count badge */}
                              {hasChildren && (
                                <span className="ms-2 text-muted" style={{ fontSize: '0.75rem' }}>
                                  ({cat.children!.length} sub)
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className={`badge ${depth === 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-secondary-subtle text-dark border'} rounded-pill px-2 py-1 fw-semibold`}>
                              {depth === 0 ? 'Root Category' : `Level ${depth} Sub`}
                            </span>
                          </td>

                          <td className="text-muted" style={{ fontSize: '0.875rem' }}>
                            {cat.description || <span className="fst-italic">—</span>}
                          </td>

                          <td>
                            <span className="badge bg-primary rounded-pill">{cat._count?.products || 0} items</span>
                          </td>

                          {isAdmin && (
                            <td>
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  className="btn btn-sm btn-outline-success p-1 px-2"
                                  title="Add sub-category"
                                  onClick={() => handleAddSubCategoryClick(cat)}
                                >
                                  <i className="bi bi-plus-lg"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary p-1 px-2"
                                  title="Edit"
                                  onClick={() => handleEditCategoryClick(cat)}
                                >
                                  <i className="bi bi-pencil-fill"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger p-1 px-2"
                                  title="Delete"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                >
                                  <i className="bi bi-trash-fill"></i>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Render children if expanded */}
                        {isExpanded && hasChildren && cat.children!.map(child => renderCategoryRow(child, depth + 1))}
                      </React.Fragment>
                    );
                  };

                  return categoryTree.map(root => renderCategoryRow(root, 0));
                })()}
              </tbody>
            </table>

            <TableControls
              total={categories.length}
              currentPage={categoryPage}
              rowsPerPage={categoryRowsPerPage}
              onRowsPerPageChange={(n) => { setCategoryRowsPerPage(n); setCategoryPage(1); }}
              onPageChange={setCategoryPage}
            />
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
                    <CascadingCategorySelect
                      categories={categoryTree.length > 0 ? categoryTree : categories}
                      value={selectedCategory}
                      onChange={(val) => setSelectedCategory(val ? String(val) : '')}
                      placeholder="-- Select Category --"
                    />
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
                  <div className="col-12 col-md-4">
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
                  <div className="col-12 col-md-4">
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
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-bold text-secondary fs-8 mb-1">Alert Qty</label>
                    <input
                      type="number" step="any" className="form-control"
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
                {/* Category Image Upload */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Category Image (Optional)</label>
                  <div
                    className="border rounded-3 d-flex flex-column align-items-center justify-content-center p-3 gap-2"
                    style={{ borderStyle: 'dashed', cursor: 'pointer', minHeight: '100px', backgroundColor: 'var(--light-bg, #f8f9fa)' }}
                    onClick={() => categoryImageInputRef.current?.click()}
                  >
                    {categoryImagePreview ? (
                      <img
                        src={categoryImagePreview}
                        alt="Category preview"
                        style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                      />
                    ) : (
                      <>
                        <i className="bi bi-image text-muted fs-2"></i>
                        <span className="text-muted fs-8">Click to upload category image</span>
                      </>
                    )}
                    {categoryImagePreview && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => { e.stopPropagation(); setCategoryImageFile(null); setCategoryImagePreview(null); }}
                      >
                        <i className="bi bi-trash-fill me-1"></i>Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={categoryImageInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCategoryImageFile(file);
                        setCategoryImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Parent Category (Optional)</label>
                  <CascadingCategorySelect
                    categories={(categoryTree.length > 0 ? categoryTree : categories).filter((c) => !editingCategory || c.id !== editingCategory.id)}
                    value={categoryForm.parentId}
                    onChange={(val) => setCategoryForm({ ...categoryForm, parentId: val })}
                    placeholder="None (Root Category)"
                    allowClear
                  />
                  <small className="text-muted fs-8">Select a parent to create a sub-category (e.g. खाद्यान्न &gt; चामल)</small>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Basmati Rice / कुट्टो ठुलो"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Brief Description</label>
                  <textarea
                    className="form-control"
                    rows={2}
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
                  {storeSettings && storeSettings.taxRateDefault > 0 && (
                    <div className="col-6">
                      <p className="text-muted mb-1 fs-8">Tax Rate</p>
                      <p className="fw-bold">{storeSettings.taxRateDefault}%</p>
                    </div>
                  )}
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

      {/* Hidden Bulk Print Area */}
      {printMode === 'bulk' && (
        <div id="bulk-barcode-print" className="bulk-print-only">
          <div className="bulk-barcode-grid">
            {(allProductsForPrint.length > 0 ? allProductsForPrint : products).map((prod, index) => (
              <div key={`${prod.id}-${index}`} className="bulk-barcode-item">
                <div className="bulk-barcode-name">{prod.name}</div>
                <div className="bulk-barcode-category">{prod.category?.name || 'Store'}</div>
                <Barcode value={prod.barcode || prod.SKU || 'UNKNOWN'} width={1.5} height={40} fontSize={12} margin={5} />
                <div className="bulk-barcode-price">Rs. {Number(prod.price).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Print Styles */}
      <style jsx global>{`
        @media print {
          ${printMode === 'bulk' ? `
          body * {
            visibility: hidden;
          }
          #bulk-barcode-print, #bulk-barcode-print * {
            visibility: visible;
          }
          #bulk-barcode-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Hide the single print modal if it was open */
          #printBarcodeModal { display: none !important; }
          #printable-receipt-modal { display: none !important; }
          .no-print { display: none !important; }
          ` : ''}

          ${printMode === 'single' ? `
          /* Hide the bulk print area */
          #bulk-barcode-print { display: none !important; }
          ` : ''}
        }

        .bulk-barcode-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          width: 100%;
          padding: 10px;
        }
        .bulk-barcode-item {
          border: 1px dashed #ccc;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          page-break-inside: avoid;
          background: white;
          border-radius: 8px;
        }
        .bulk-barcode-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .bulk-barcode-category {
          font-size: 10px;
          color: #666;
          margin-bottom: 5px;
        }
        .bulk-barcode-price {
          font-size: 14px;
          font-weight: bold;
          margin-top: 5px;
        }
      `}</style>
      {/* ==========================================
          MODAL: UNIT CONVERSIONS
          ========================================== */}
      <div className="modal fade text-dark" id="unitConversionsModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg rounded-lg">
            <div className="modal-header bg-primary text-white border-none p-3.5">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-calculator me-2"></i>Unit Conversions for {selectedProductForUnits?.name}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4">
              <form onSubmit={handleUnitConversionSubmit} className="mb-4 p-3 bg-light rounded border">
                <h6 className="fw-bold mb-3">Add New Conversion</h6>
                <div className="row g-2 align-items-end">
                  <div className="col-md-3">
                    <label className="form-label fs-8 fw-bold">Base Unit</label>
                    <input type="text" className="form-control" value={selectedProductForUnits?.unit || ''} disabled />
                  </div>
                  <div className="col-md-1 text-center pb-2 fw-bold">=</div>
                  <div className="col-md-3">
                    <label className="form-label fs-8 fw-bold">Factor</label>
                    <input type="number" step="any" className="form-control" value={ucFactor} onChange={e => setUcFactor(e.target.value)} required placeholder="e.g. 1000" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fs-8 fw-bold">Secondary Unit</label>
                    <input type="text" className="form-control" value={ucSecondary} onChange={e => setUcSecondary(e.target.value)} required placeholder="e.g. Gram" />
                  </div>
                  <div className="col-md-2">
                    <button type="submit" className="btn btn-primary w-100 fw-bold">Add</button>
                  </div>
                </div>
              </form>
              
              <h6 className="fw-bold mb-2">Existing Conversions</h6>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead className="bg-light">
                    <tr>
                      <th>Base Unit</th>
                      <th>Conversion Factor</th>
                      <th>Secondary Unit</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductForUnits?.unitConversions?.length > 0 ? (
                      selectedProductForUnits.unitConversions.map((uc: any) => (
                        <tr key={uc.id}>
                          <td>{uc.baseUnit}</td>
                          <td>{uc.conversionFactor}</td>
                          <td>{uc.secondaryUnit}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUnitConversion(uc.id)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">No conversions set</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
