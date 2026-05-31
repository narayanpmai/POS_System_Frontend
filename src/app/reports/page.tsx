'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { Bar } from 'react-chartjs-2';
import { formatAdToBsShort } from '@/utils/nepaliDate';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DailySummaryData {
  totalIncome: number;
  salesCount: number;
  totalIncomes: number;
  totalInvestments: number;
  incomesCount: number;
  totalExpenses: number;
  expensesCount: number;
  totalPurchases: number;
  purchasesCount: number;
  netProfit: number;
}

interface TimelinePoint {
  date: string;
  income: number;
  outflow: number;
  investment?: number;
}

export default function ReportsPage() {
  const { token, api, activeFiscalYear } = useAuth();

  const [activeTab, setActiveTab] = useState<'daily' | 'closing_stock' | 'closing_balance'>('daily');

  // Daily Report States
  const todayStr = new Date().toISOString().split('T')[0];
  const monthAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(monthAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DailySummaryData>({
    totalIncome: 0,
    salesCount: 0,
    totalIncomes: 0,
    totalInvestments: 0,
    incomesCount: 0,
    totalExpenses: 0,
    expensesCount: 0,
    totalPurchases: 0,
    purchasesCount: 0,
    netProfit: 0
  });
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);

  // Closing States
  const [closingStock, setClosingStock] = useState<any>(null);
  const [closingBalance, setClosingBalance] = useState<any>(null);

  // Loaders
  const loadDailyReport = async (start: string, end: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/reports/daily-summary?startDate=${start}&endDate=${end}`);
      setSummary({
        totalIncome: res.data.totalIncome || 0,
        salesCount: res.data.salesCount || 0,
        totalIncomes: res.data.totalIncomes || 0,
        totalInvestments: res.data.totalInvestments || 0,
        incomesCount: res.data.incomesCount || 0,
        totalExpenses: res.data.totalExpenses || 0,
        expensesCount: res.data.expensesCount || 0,
        totalPurchases: res.data.totalPurchases || 0,
        purchasesCount: res.data.purchasesCount || 0,
        netProfit: res.data.netProfit || 0
      });
      setTimeline(res.data.timeline || []);
      setRecentSales(res.data.recentSales || []);
      setRecentExpenses(res.data.recentExpenses || []);
    } catch (err) {
      console.error('Error fetching daily financial reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClosingStock = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/reports/closing-stock');
      setClosingStock(res.data);
    } catch (err) {
      console.error('Error fetching closing stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClosingBalance = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/reports/closing-balance');
      setClosingBalance(res.data);
    } catch (err) {
      console.error('Error fetching closing balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport(startDate, endDate);
    } else if (activeTab === 'closing_stock') {
      loadClosingStock();
    } else if (activeTab === 'closing_balance') {
      loadClosingBalance();
    }
  }, [token, activeFiscalYear, activeTab]);

  const handleFilter = () => {
    if (activeTab === 'daily') loadDailyReport(startDate, endDate);
  };

  const handleReset = () => {
    setStartDate(monthAgoStr);
    setEndDate(todayStr);
    if (activeTab === 'daily') loadDailyReport(monthAgoStr, todayStr);
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      return formatAdToBsShort(dateStr);
    } catch {
      return dateStr;
    }
  };

  // Chart configuration
  const chartData = {
    labels: timeline.map((t) => formatDateLabel(t.date)),
    datasets: [
      {
        label: 'Income (Sales)',
        data: timeline.map((t) => t.income),
        backgroundColor: '#10b981', // green
        borderRadius: 4
      },
      {
        label: 'Outflow (Expenses + Purchases)',
        data: timeline.map((t) => t.outflow),
        backgroundColor: '#ef4444', // red
        borderRadius: 4
      },
      {
        label: 'Investment (Capital)',
        data: timeline.map((t) => t.investment || 0),
        backgroundColor: '#8b5cf6', // purple
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, align: 'end' as const }
    },
    scales: {
      y: { grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <AuthLayout>
      {/* Tabs */}
      <ul className="nav nav-pills mb-4" style={{ gap: '0.5rem' }}>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'daily' ? 'active shadow-sm' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('daily')}
          >
            <i className="bi bi-graph-up me-2"></i> Daily Reports
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'closing_stock' ? 'active shadow-sm' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('closing_stock')}
          >
            <i className="bi bi-box-seam me-2"></i> Closing Stock
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'closing_balance' ? 'active shadow-sm' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('closing_balance')}
          >
            <i className="bi bi-wallet2 me-2"></i> Closing Balance
          </button>
        </li>
      </ul>

      {activeTab === 'daily' && (
        <>
          {/* Top Filter Bar */}
          <div className="card border-0 rounded-md shadow-sm p-3 mb-4 bg-white" style={{ borderRadius: '10px' }}>
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label font-weight-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>From Date</label>
                <input
                  type="date"
                  className="form-control bg-light border-0 p-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label font-weight-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>To Date</label>
                <input
                  type="date"
                  className="form-control bg-light border-0 p-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
              <div className="col-12 col-md-3">
                <button 
                  className="btn btn-primary w-100 py-2 font-weight-bold d-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: '#0d6efd', borderRadius: '6px', height: '38px', border: 'none' }}
                  onClick={handleFilter}
                >
                  <i className="bi bi-funnel-fill"></i> Filter Report
                </button>
              </div>
              <div className="col-12 col-md-3">
                <button 
                  className="btn btn-outline-secondary w-100 py-2 font-weight-semibold d-flex align-items-center justify-content-center gap-2 border bg-white text-secondary"
                  style={{ borderRadius: '6px', height: '38px' }}
                  onClick={handleReset}
                >
                  <i className="bi bi-arrow-counterclockwise"></i> Reset
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : (
            <>
              {/* Telemetry Row */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="card border-0 shadow-sm p-3 text-center bg-white" style={{ borderRadius: '10px' }}>
                    <div className="mb-2"><i className="bi bi-graph-up fs-4 text-success" style={{ color: '#198754' }}></i></div>
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Total Income (Sales)</div>
                    <div className="font-weight-bold text-success mb-1" style={{ fontSize: '1.25rem' }}>
                      Rs.{summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="card border-0 shadow-sm p-3 text-center bg-white" style={{ borderRadius: '10px' }}>
                    <div className="mb-2"><i className="bi bi-receipt fs-4 text-danger" style={{ color: '#dc3545' }}></i></div>
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Total Expenses</div>
                    <div className="font-weight-bold text-danger mb-1" style={{ fontSize: '1.25rem' }}>
                      Rs.{summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="card border-0 shadow-sm p-3 text-center bg-white" style={{ borderRadius: '10px' }}>
                    <div className="mb-2"><i className="bi bi-cart3 fs-4 text-warning" style={{ color: '#fd7e14' }}></i></div>
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Total Purchases</div>
                    <div className="font-weight-bold text-warning mb-1" style={{ fontSize: '1.25rem' }}>
                      Rs.{summary.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="card border-0 shadow-sm p-3 text-center bg-white" style={{ borderRadius: '10px' }}>
                    <div className="mb-2"><i className="bi bi-cash-coin fs-4" style={{ color: summary.netProfit < 0 ? '#dc3545' : '#198754' }}></i></div>
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Net Profit / Loss</div>
                    <div className="font-weight-bold mb-1" style={{ fontSize: '1.25rem', color: summary.netProfit < 0 ? '#dc3545' : '#198754' }}>
                      {summary.netProfit < 0 ? '-' : ''}Rs.{Math.abs(summary.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Row */}
              <div className="card border-0 shadow-sm p-4 mb-4 bg-white" style={{ borderRadius: '10px' }}>
                <h5 className="font-weight-bold text-dark mb-4"><i className="bi bi-bar-chart-line-fill text-primary me-2"></i> Income vs Expenses</h5>
                <div style={{ height: '360px' }}>
                  {timeline.length > 0 ? (
                    <Bar data={chartData} options={chartOptions} />
                  ) : (
                    <div className="text-muted text-center py-5">No data available</div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'closing_stock' && (
        <div className="card border-0 rounded-md shadow-sm p-4 bg-white" style={{ borderRadius: '10px' }}>
          <h5 className="font-weight-bold text-dark mb-4 d-flex align-items-center gap-2">
            <i className="bi bi-box-seam text-primary"></i>
            Closing Stock as of FY {closingStock?.fiscalYear}
          </h5>
          
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
          ) : closingStock ? (
            <>
              <div className="alert alert-info border-0 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '8px' }}>
                <div>
                  <h6 className="mb-1 fw-bold">Total Inventory Valuation</h6>
                  <small>Calculated based on product cost price at the end of active fiscal year.</small>
                </div>
                <h3 className="mb-0 fw-bold">Rs. {closingStock.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-3 ps-3 text-secondary" style={{ fontSize: '0.85rem' }}>Product Name</th>
                      <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>SKU</th>
                      <th className="py-3 text-secondary text-end" style={{ fontSize: '0.85rem' }}>Closing Quantity</th>
                      <th className="py-3 text-secondary text-end pe-3" style={{ fontSize: '0.85rem' }}>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closingStock.products.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-muted">No stock data found for this fiscal year.</td></tr>
                    ) : (
                      closingStock.products.map((p: any) => (
                        <tr key={p.id}>
                          <td className="ps-3 py-3 fw-semibold text-dark">{p.name}</td>
                          <td className="py-3 text-secondary">{p.SKU}</td>
                          <td className="py-3 text-end">
                            <span className="badge bg-primary rounded-pill px-3 py-2">{p.closingQuantity}</span>
                          </td>
                          <td className="py-3 text-end pe-3 fw-bold text-success">
                            Rs. {p.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted">Failed to load closing stock.</div>
          )}
        </div>
      )}

      {activeTab === 'closing_balance' && (
        <div className="card border-0 rounded-md shadow-sm p-4 bg-white" style={{ borderRadius: '10px' }}>
          <h5 className="font-weight-bold text-dark mb-4 d-flex align-items-center gap-2">
            <i className="bi bi-wallet2 text-primary"></i>
            Closing Balance for FY {closingBalance?.fiscalYear}
          </h5>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
          ) : closingBalance ? (
            <div className="row justify-content-center">
              <div className="col-12 col-md-8 col-lg-6">
                <div className="bg-light p-4 rounded-3 border">
                  
                  <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                    <span className="text-secondary fw-semibold">Opening Balance</span>
                    <span className="fw-bold text-dark">Rs. {closingBalance.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                    <span className="text-secondary fw-semibold">Add: Total Income (Sales)</span>
                    <span className="fw-bold text-success">+ Rs. {closingBalance.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="d-flex justify-content-between mb-4 border-bottom pb-2">
                    <span className="text-secondary fw-semibold">Less: Total Expenses & Purchases</span>
                    <span className="fw-bold text-danger">- Rs. {closingBalance.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center bg-primary text-white p-3 rounded-3 shadow-sm">
                    <span className="fw-bold fs-5">Closing Balance</span>
                    <span className="fw-bold fs-4">Rs. {closingBalance.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted">Failed to load closing balance.</div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
