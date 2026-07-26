'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/AuthLayout';

export default function AiInsightsPage() {
  const { api } = useAuth();
  const [salesPred, setSalesPred] = useState<any>(null);
  const [reorder, setReorder] = useState<any[]>([]);
  const [slowMoving, setSlowMoving] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, reorderRes, slowRes] = await Promise.all([
        api.get('/ai/sales-prediction'),
        api.get('/ai/reorder-suggestions'),
        api.get('/ai/slow-moving-products')
      ]);
      setSalesPred(salesRes.data);
      setReorder(reorderRes.data);
      setSlowMoving(slowRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="container-fluid py-4">
        <h2 className="mb-4 fw-bold">🤖 AI Insights & Predictions</h2>
        
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card shadow-sm border-0 h-100" style={{ background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' }}>
              <div className="card-body text-center">
                <h5 className="text-muted fw-bold mb-3">Sales Prediction (Next 30 Days)</h5>
                <h2 className="text-primary fw-bold mb-0">Rs. {salesPred?.predictedNext30Days?.toFixed(2)}</h2>
                <p className="mt-2 text-success fw-bold">
                  <i className="bi bi-graph-up-arrow me-1"></i>
                  {salesPred?.trend} ({(salesPred?.confidence * 100).toFixed(0)}% Confidence)
                </p>
                <small className="text-muted">Based on previous 30 days: Rs. {salesPred?.last30Days?.toFixed(2)}</small>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
                <h5 className="fw-bold text-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>Reorder Suggestions</h5>
              </div>
              <div className="card-body">
                {reorder.length === 0 ? (
                  <p className="text-muted text-center py-4">Inventory levels are healthy.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-borderless">
                      <thead className="table-light">
                        <tr>
                          <th>Product</th>
                          <th>Stock</th>
                          <th>Suggested Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reorder.map(r => (
                          <tr key={r.productId}>
                            <td className="fw-bold">{r.name}</td>
                            <td className="text-danger fw-bold">{r.currentStock}</td>
                            <td className="text-primary fw-bold">+{r.suggestedOrderQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
                <h5 className="fw-bold text-warning"><i className="bi bi-hourglass-bottom me-2"></i>Slow Moving Stock</h5>
              </div>
              <div className="card-body">
                {slowMoving.length === 0 ? (
                  <p className="text-muted text-center py-4">No slow moving products detected.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-borderless">
                      <thead className="table-light">
                        <tr>
                          <th>Product</th>
                          <th>Stock</th>
                          <th>Suggestion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slowMoving.slice(0,5).map(s => (
                          <tr key={s.productId}>
                            <td className="fw-bold">{s.name}</td>
                            <td>{s.stock}</td>
                            <td className="text-muted fs-7">{s.suggestion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
