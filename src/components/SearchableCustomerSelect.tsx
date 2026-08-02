'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toSafeArray } from '@/utils/array';

export interface CustomerOption {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  membershipTier?: {
    name: string;
    discountPercent: number;
  };
}

interface SearchableCustomerSelectProps {
  customers: CustomerOption[];
  selectedCustomerId: number | null;
  onSelectCustomer: (id: number | null) => void;
  placeholder?: string;
}

export default function SearchableCustomerSelect({
  customers: rawCustomers,
  selectedCustomerId,
  onSelectCustomer,
  placeholder = 'Search customer by name, phone, or email...',
}: SearchableCustomerSelectProps) {
  const customers = toSafeArray<CustomerOption>(rawCustomers);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Filter customers by name, phone, or email
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

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
    <div ref={containerRef} className="position-relative flex-grow-1">
      {/* Selected Value Trigger Bar */}
      <div
        className="form-control d-flex justify-content-between align-items-center cursor-pointer bg-white"
        style={{
          borderRadius: '8px',
          padding: '8px 12px',
          border: '1px solid #dee2e6',
          fontSize: '0.9rem',
          minHeight: '40px',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="d-flex align-items-center gap-2 text-truncate" style={{ flex: 1, minWidth: 0 }}>
          <i className="bi bi-person-circle text-primary"></i>
          {selectedCustomer ? (
            <span className="fw-semibold text-dark text-truncate">
              {selectedCustomer.name}{' '}
              {selectedCustomer.phone && (
                <small className="text-muted fw-normal">({selectedCustomer.phone})</small>
              )}
            </span>
          ) : (
            <span className="text-secondary fw-medium">Walk-in Customer (Default)</span>
          )}
        </div>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-muted ms-2`}></i>
      </div>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className="position-absolute start-0 end-0 bg-white border rounded-3 shadow-lg p-2 mt-1"
          style={{ zIndex: 1050, maxHeight: '300px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search Bar Input */}
          <div className="input-group input-group-sm mb-2">
            <span className="input-group-text bg-light border-end-0 text-muted">
              <i className="bi bi-search"></i>
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
          <div className="overflow-y-auto" style={{ flex: 1 }}>
            {/* Walk-in Customer Option */}
            <div
              className={`p-2 rounded cursor-pointer d-flex justify-content-between align-items-center mb-1 ${
                selectedCustomerId === null ? 'bg-primary-subtle fw-bold text-primary' : 'hover-bg-light text-dark'
              }`}
              onClick={() => {
                onSelectCustomer(null);
                setIsOpen(false);
                setSearchQuery('');
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-person text-secondary"></i>
                <span>Walk-in Customer (Default)</span>
              </div>
              {selectedCustomerId === null && <i className="bi bi-check2 text-primary"></i>}
            </div>

            {/* Filtered Customer Options */}
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-3 text-muted small">
                No customer found matching "{searchQuery}"
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = cust.id === selectedCustomerId;
                return (
                  <div
                    key={cust.id}
                    className={`p-2 rounded cursor-pointer mb-1 border-bottom-subtle ${
                      isSelected ? 'bg-primary-subtle fw-bold text-primary' : 'hover-bg-light text-dark'
                    }`}
                    onClick={() => {
                      onSelectCustomer(cust.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                          {cust.name}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {cust.phone && <span className="me-2"><i className="bi bi-telephone me-1"></i>{cust.phone}</span>}
                          {cust.email && <span><i className="bi bi-envelope me-1"></i>{cust.email}</span>}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        {cust.membershipTier && (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.7rem' }}>
                            {cust.membershipTier.name}
                          </span>
                        )}
                        {isSelected && <i className="bi bi-check2 text-primary ms-1"></i>}
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
