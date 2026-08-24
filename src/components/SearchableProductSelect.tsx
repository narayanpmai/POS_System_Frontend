'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatStock } from '@/utils/number';

export interface ProductOption {
  id: number;
  name: string;
  SKU?: string;
  barcode?: string;
  cost?: number;
  price?: number;
  stock?: number;
  unit?: string;
  category?: {
    id: number;
    name: string;
  };
}

interface SearchableProductSelectProps {
  products: ProductOption[];
  selectedProductId: number | string | null;
  onSelectProduct: (product: ProductOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableProductSelect({
  products,
  selectedProductId,
  onSelectProduct,
  placeholder = 'Search by name, SKU, or scan barcode...',
  disabled = false,
}: SearchableProductSelectProps) {
  const { api } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteProducts, setRemoteProducts] = useState<ProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Combined product list (local list + remote search results)
  const combinedProductsMap = new Map<number, ProductOption>();
  (products || []).forEach((p) => combinedProductsMap.set(p.id, p));
  remoteProducts.forEach((p) => combinedProductsMap.set(p.id, p));
  const allAvailableProducts = Array.from(combinedProductsMap.values());

  const selectedProduct = allAvailableProducts.find(
    (p) => String(p.id) === String(selectedProductId),
  );

  // Filter products by name, SKU, or barcode locally
  const filteredProducts = allAvailableProducts.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.SKU && p.SKU.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  // Debounced server search fallback if query has >= 2 characters
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setRemoteProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get(`/products?search=${encodeURIComponent(q)}&limit=50`);
        const items = res.data?.items || res.data || [];
        setRemoteProducts(items);
      } catch (err) {
        console.error('Failed to remote search products:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, api]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="position-relative flex-grow-1" style={{ minWidth: '220px' }}>
      {/* Selected Value Trigger Bar */}
      <div
        className={`form-control d-flex justify-content-between align-items-center cursor-pointer bg-white ${
          disabled ? 'bg-light text-muted cursor-not-allowed' : ''
        }`}
        style={{
          borderRadius: '6px',
          padding: '6px 10px',
          border: '1px solid #ced4da',
          fontSize: '0.875rem',
          minHeight: '38px',
        }}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        <div className="d-flex align-items-center gap-2 text-truncate" style={{ flex: 1, minWidth: 0 }}>
          <i className="bi bi-box-seam text-primary"></i>
          {selectedProduct ? (
            <div className="d-flex align-items-center gap-1.5 text-truncate">
              <span className="fw-semibold text-dark text-truncate">{selectedProduct.name}</span>
              {selectedProduct.SKU && (
                <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-1.5 py-0.5" style={{ fontSize: '0.72rem' }}>
                  {selectedProduct.SKU}
                </span>
              )}
            </div>
          ) : (
            <span className="text-secondary fw-normal">-- Select / Search Product --</span>
          )}
        </div>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-muted ms-2`} style={{ fontSize: '0.8rem' }}></i>
      </div>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className="position-absolute start-0 bg-white border rounded-3 shadow-lg p-2 mt-1"
          style={{
            zIndex: 1080,
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: '300px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Search Bar Input */}
          <div className="input-group input-group-sm mb-2">
            <span className="input-group-text bg-light border-end-0 text-muted">
              {isSearching ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <i className="bi bi-search"></i>
              )}
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="form-control border-start-0 bg-light"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => setSearchQuery('')}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>

          {/* Options Scroll List */}
          <div className="overflow-y-auto" style={{ flex: 1, maxHeight: '240px' }}>
            {/* Clear Selection Option */}
            <div
              className={`p-2 rounded cursor-pointer d-flex justify-content-between align-items-center mb-1 ${
                !selectedProductId ? 'bg-primary-subtle fw-bold text-primary' : 'hover-bg-light text-muted'
              }`}
              onClick={() => {
                onSelectProduct(null);
                setIsOpen(false);
                setSearchQuery('');
              }}
            >
              <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-x-circle text-secondary"></i>
                <span>-- Clear Selection --</span>
              </div>
              {!selectedProductId && <i className="bi bi-check2 text-primary"></i>}
            </div>

            {/* Filtered Product Options */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-3 text-muted small">
                {isSearching ? 'Searching products...' : `No product matching "${searchQuery}"`}
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const isSelected = String(prod.id) === String(selectedProductId);
                const currentStock = prod.stock ?? 0;
                return (
                  <div
                    key={prod.id}
                    className={`p-2 rounded cursor-pointer mb-1 border-bottom-subtle ${
                      isSelected ? 'bg-primary-subtle fw-bold text-primary' : 'hover-bg-light text-dark'
                    }`}
                    onClick={() => {
                      onSelectProduct(prod);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-truncate pe-2" style={{ flex: 1 }}>
                        <div className="fw-semibold text-truncate" style={{ fontSize: '0.875rem' }}>
                          {prod.name}
                        </div>
                        <div className="text-muted d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: '0.75rem' }}>
                          {prod.SKU && <span>SKU: <strong className="text-dark">{prod.SKU}</strong></span>}
                          {prod.barcode && <span>Barcode: {prod.barcode}</span>}
                          {prod.unit && <span>Unit: {prod.unit}</span>}
                        </div>
                      </div>
                      <div className="d-flex flex-column align-items-end flex-shrink-0">
                        <span className="fw-bold text-primary" style={{ fontSize: '0.85rem' }}>
                          Rs. {(prod.cost ?? prod.price ?? 0).toFixed(2)}
                        </span>
                        <span
                          className={`badge ${
                            currentStock > 0 ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'
                          } border mt-0.5`}
                          style={{ fontSize: '0.68rem' }}
                        >
                          Stock: {formatStock(currentStock)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
