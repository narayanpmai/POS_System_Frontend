'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

interface InventoryItem {
  id: number;
  name: string;
  SKU: string;
  category: string;
  stock: number;
  minStockAlert: number;
  isLowStock: boolean;
  price: number;
  cost: number;
  valuation: number;
  retailValuation: number;
}

export default function InventoryPage() {
  const { user, token, api } = useAuth();
  const isAdmin = user?.role?.name === 'Admin';

  const [ledger, setLedger] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Stock Adjustment Form
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT'>('STOCK_IN');
  const [adjustReason, setAdjustReason] = useState<string>('Purchase restock');

  const loadLedger = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/reports/inventory-valuation');
      setLedger(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching inventory ledgers:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [token]);

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Administrators can perform manual stock flow adjustments');
      return;
    }
    if (!selectedProductId) return;

    try {
      await api.patch(`/products/${selectedProductId}/stock`, {
        quantity: Number(adjustQty),
        type: adjustType,
        reason: adjustReason,
      });

      alert('Stock successfully adjusted!');
      setAdjustQty(0);
      setSelectedProductId(null);
      
      // Hide Modal
      const modalElement = document.getElementById('adjustStockModal');
      const bootstrap = require('bootstrap');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal?.hide();

      loadLedger();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing adjustment');
    }
  };

  const handleAdjustClick = (prodId: number, name: string) => {
    setSelectedProductId(prodId);
    setAdjustReason('Purchase restock');
    setAdjustQty(0);
    
    const modalElement = document.getElementById('adjustStockModal');
    const bootstrap = require('bootstrap');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  };

  const filteredItems = ledger?.items?.filter((item: InventoryItem) => {
    if (filterLowStock) return item.isLowStock;
    return true;
  }) || [];

  return (
    <AuthLayout>
      {/* Overview Stat Widgets */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-md-3">
          <div className="stat-card stat-card-blue h-100">
            <span className="text-secondary text-uppercase fs-7 font-weight-bold">Total Asset Cost</span>
            <h3 className="mt-2 font-weight-bold">Rs. {ledger?.totalValuation?.toFixed(2) || '0.00'}</h3>
            <small className="text-muted">Total inventory cost value</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="stat-card stat-card-blue h-100">
            <span className="text-secondary text-uppercase fs-7 font-weight-bold">Potential Retail Value</span>
            <h3 className="mt-2 font-weight-bold text-primary">Rs. {ledger?.totalRetailValuation?.toFixed(2) || '0.00'}</h3>
            <small className="text-success font-weight-semibold">
              Profits potential: Rs. {(ledger?.totalRetailValuation - ledger?.totalValuation).toFixed(2)}
            </small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="stat-card stat-card-orange h-100">
            <span className="text-secondary text-uppercase fs-7 font-weight-bold">Active SKUs Catalogued</span>
            <h3 className="mt-2 font-weight-bold">{ledger?.totalItemsCount || 0}</h3>
            <small className="text-muted">Unique items</small>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className="stat-card stat-card-orange h-100">
            <span className="text-secondary text-uppercase fs-7 font-weight-bold">Low Stock Warning items</span>
            <h3 className="mt-2 font-weight-bold text-danger">{ledger?.lowStockItemsCount || 0}</h3>
            <small className={ledger?.lowStockItemsCount > 0 ? 'text-danger font-weight-semibold' : 'text-muted'}>
              {ledger?.lowStockItemsCount > 0 ? 'Action required immediately' : 'Inventory stable'}
            </small>
          </div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="card border-none rounded-lg p-4 shadow-sm" style={{ backgroundColor: 'var(--light-card)', border: '1px solid var(--border-color)' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="font-weight-bold m-0 d-flex align-items-center gap-2">
            <i className="bi bi-box-seam-fill text-primary"></i>
            Stock Ledger & Valuations
          </h5>
          <div className="form-check form-switch bg-light border px-4 py-2 rounded-pill shadow-sm">
            <input
              className="form-check-input ms-0 me-2"
              type="checkbox"
              id="lowStockFilterSwitch"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
            />
            <label className="form-check-label font-weight-semibold" htmlFor="lowStockFilterSwitch">Low Stock Only</label>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table custom-table m-0">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Cost/Unit</th>
                <th>Valuation (Cost)</th>
                <th>Retail/Unit</th>
                {isAdmin && <th>Adjustment</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-4 text-muted">No stock items matching selection</td>
                </tr>
              ) : (
                filteredItems.map((item: InventoryItem) => (
                  <tr key={item.id} className={item.isLowStock ? 'table-danger-subtle' : ''}>
                    <td className="font-weight-bold font-mono fs-8">{item.SKU}</td>
                    <td className="font-weight-semibold text-dark">{item.name}</td>
                    <td><span className="badge bg-secondary-subtle text-secondary px-2.5 py-1 rounded-pill">{item.category}</span></td>
                    <td>
                      <span className={`badge ${item.isLowStock ? 'badge-low-stock' : 'badge-in-stock'} rounded-pill px-2.5 py-1`}>
                        {item.stock} / alert: {item.minStockAlert}
                      </span>
                    </td>
                    <td className="text-muted font-weight-medium">Rs. {item.cost.toFixed(2)}</td>
                    <td className="font-weight-bold text-dark">Rs. {item.valuation.toFixed(2)}</td>
                    <td className="font-weight-semibold text-primary">Rs. {item.price.toFixed(2)}</td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn btn-sm btn-outline-warning text-dark border-warning font-weight-semibold py-1 px-2.5 rounded-md"
                          onClick={() => handleAdjustClick(item.id, item.name)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <i className="bi bi-arrow-down-up me-1"></i>Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          MODAL: MANUAL STOCK ADJUSTMENT MODAL
          ========================================== */}
      <div className="modal fade text-dark" id="adjustStockModal" tabIndex={-1} aria-labelledby="adjustStockModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-lg">
            <div className="modal-header bg-warning text-dark border-none p-3.5">
              <h5 className="modal-title font-weight-bold" id="adjustStockModalLabel">
                <i className="bi bi-arrow-down-up me-2"></i>Manual Stock adjustment flow
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form onSubmit={handleAdjustmentSubmit}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label font-weight-semibold">Adjustment Flow Type</label>
                  <select
                    className="form-select"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as 'STOCK_IN' | 'STOCK_OUT')}
                  >
                    <option value="STOCK_IN">STOCK IN (Addition/Purchase restock)</option>
                    <option value="STOCK_OUT">STOCK OUT (Reduction/Damage/Correction)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label font-weight-semibold">Adjustment Quantity</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    placeholder="E.g. 10"
                    value={adjustQty || ''}
                    onChange={(e) => setAdjustQty(Number(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label font-weight-semibold">Adjustment Reason</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="E.g. Purchase Restock, Damage write-off"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer border-top p-3">
                <button type="button" className="btn btn-light rounded-md" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-warning rounded-md text-dark font-weight-bold">Adjust Stock</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
