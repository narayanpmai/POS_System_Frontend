'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Bar } from 'react-chartjs-2';
import { formatAdToBsShort, formatAdToBsFull } from '@/utils/nepaliDate';
import { formatStock } from '@/utils/number';
import BSDatePicker from '@/components/BSDatePicker';
import TableControls from '@/components/TableControls';
import Barcode from 'react-barcode';
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
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'daily' | 'stock_movements' | 'closing_stock' | 'closing_balance' | 'deleted_sales' | 'barcodes'>('daily');

  // Barcodes State
  const [products, setProducts] = useState<any[]>([]);
  const [selectedBarcodes, setSelectedBarcodes] = useState<Set<number>>(new Set());
  const [barcodeSearch, setBarcodeSearch] = useState('');

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

  // Deleted Sales State
  const [deletedSales, setDeletedSales] = useState<any[]>([]);

  // Stock Movement States
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [stockMovementsSummary, setStockMovementsSummary] = useState<any>({
    totalInflow: 0,
    totalOutflow: 0,
    netMovement: 0,
    inflowCount: 0,
    outflowCount: 0,
    totalRecords: 0,
  });
  const [stockMovementType, setStockMovementType] = useState<'ALL' | 'STOCK_IN' | 'STOCK_OUT'>('ALL');
  const [stockMovementSearch, setStockMovementSearch] = useState('');
  const [stockMovementPage, setStockMovementPage] = useState(1);
  const [stockMovementLimit, setStockMovementLimit] = useState(25);
  const [stockMovementTotal, setStockMovementTotal] = useState(0);
  const [stockMovementStartDate, setStockMovementStartDate] = useState(monthAgoStr);
  const [stockMovementEndDate, setStockMovementEndDate] = useState(todayStr);

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

  const loadStockMovements = async (
    page = stockMovementPage,
    limit = stockMovementLimit,
    type = stockMovementType,
    search = stockMovementSearch,
    start = stockMovementStartDate,
    end = stockMovementEndDate,
  ) => {
    if (!token) return;
    setLoading(true);
    try {
      const typeParam = type !== 'ALL' ? `&type=${type}` : '';
      const searchParam = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const startParam = start?.trim() ? `&startDate=${start.trim()}` : '';
      const endParam = end?.trim() ? `&endDate=${end.trim()}` : '';
      const res = await api.get(
        `/reports/stock-movements?page=${page}&limit=${limit}${typeParam}${searchParam}${startParam}${endParam}`,
      );
      setStockMovements(res.data?.items || []);
      setStockMovementTotal(res.data?.total || 0);
      setStockMovementsSummary(
        res.data?.summary || {
          totalInflow: 0,
          totalOutflow: 0,
          netMovement: 0,
          inflowCount: 0,
          outflowCount: 0,
          totalRecords: 0,
        },
      );
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportStockMovementsToCSV = () => {
    if (stockMovements.length === 0) {
      alert('No stock movements data to export');
      return;
    }
    const headers = ['S.N.', 'Date (BS)', 'Date (AD)', 'Product Name', 'SKU', 'Type', 'Quantity', 'Unit', 'Reason / Reference', 'User'];
    const rows = stockMovements.map((item, idx) => [
      idx + 1,
      formatAdToBsShort(item.createdAt),
      new Date(item.createdAt).toLocaleString(),
      `"${(item.product?.name || '').replace(/"/g, '""')}"`,
      `"${item.product?.SKU || ''}"`,
      item.type,
      item.quantity,
      item.product?.unit || 'pcs',
      `"${(item.reason || '').replace(/"/g, '""')}"`,
      `"${item.user?.name || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const loadDeletedSales = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/sales/deleted');
      setDeletedSales(res.data);
    } catch (err) {
      console.error('Error fetching deleted sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsForBarcodes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data?.items || res.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyReport(startDate, endDate);
    } else if (activeTab === 'stock_movements') {
      loadStockMovements(
        stockMovementPage,
        stockMovementLimit,
        stockMovementType,
        stockMovementSearch,
        stockMovementStartDate,
        stockMovementEndDate,
      );
    } else if (activeTab === 'closing_stock') {
      loadClosingStock();
    } else if (activeTab === 'closing_balance') {
      loadClosingBalance();
    } else if (activeTab === 'deleted_sales') {
      loadDeletedSales();
    } else if (activeTab === 'barcodes') {
      loadProductsForBarcodes();
    }
  }, [token, activeFiscalYear, activeTab, stockMovementPage, stockMovementLimit, stockMovementType]);

  const handleFilter = () => {
    if (activeTab === 'daily') loadDailyReport(startDate, endDate);
    if (activeTab === 'stock_movements') {
      setStockMovementPage(1);
      loadStockMovements(1, stockMovementLimit, stockMovementType, stockMovementSearch, stockMovementStartDate, stockMovementEndDate);
    }
  };

  const handleReset = () => {
    if (activeTab === 'daily') {
      setStartDate(monthAgoStr);
      setEndDate(todayStr);
      loadDailyReport(monthAgoStr, todayStr);
    } else if (activeTab === 'stock_movements') {
      setStockMovementStartDate(monthAgoStr);
      setStockMovementEndDate(todayStr);
      setStockMovementType('ALL');
      setStockMovementSearch('');
      setStockMovementPage(1);
      loadStockMovements(1, stockMovementLimit, 'ALL', '', monthAgoStr, todayStr);
    }
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
        label: 'Investment / Other Incomes',
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
            <i className="bi bi-graph-up me-2"></i> {t('reports', 'daily_reports') || 'Daily Reports'}
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'stock_movements' ? 'active shadow-sm' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('stock_movements')}
          >
            <i className="bi bi-arrow-left-right me-2"></i> Stock Movement Audit
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'closing_stock' ? 'active shadow-sm' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('closing_stock')}
          >
            <i className="bi bi-box-seam me-2"></i> {t('reports', 'closing_stock') || 'Closing Stock'}
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'closing_balance' ? 'active shadow-sm' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('closing_balance')}
          >
            <i className="bi bi-wallet2 me-2"></i> {t('reports', 'closing_balance') || 'Closing Balance'}
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'deleted_sales' ? 'active shadow-sm bg-danger text-white border-0' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('deleted_sales')}
          >
            <i className="bi bi-trash-fill me-2"></i> {t('reports', 'deleted_sales') || 'Deleted Sales'}
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-bold ${activeTab === 'barcodes' ? 'active shadow-sm' : 'bg-white text-secondary border'}`}
            style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            onClick={() => setActiveTab('barcodes')}
          >
            <i className="bi bi-qr-code-scan me-2"></i> Barcodes
          </button>
        </li>
      </ul>

      {activeTab === 'stock_movements' && (
        <div className="animate-fade-in-up">
          {/* Top Filter Bar */}
          <div className="card border-0 rounded-md shadow-sm p-3 mb-4 bg-white" style={{ borderRadius: '10px' }}>
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>{t('reports', 'from_date') || 'From Date (BS/AD)'}</label>
                <BSDatePicker
                  value={stockMovementStartDate}
                  onChange={(val) => {
                    setStockMovementStartDate(val);
                    setStockMovementPage(1);
                    loadStockMovements(1, stockMovementLimit, stockMovementType, stockMovementSearch, val, stockMovementEndDate);
                  }}
                  className="form-control bg-light border-0 p-2"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>{t('reports', 'to_date') || 'To Date (BS/AD)'}</label>
                <BSDatePicker
                  value={stockMovementEndDate}
                  onChange={(val) => {
                    setStockMovementEndDate(val);
                    setStockMovementPage(1);
                    loadStockMovements(1, stockMovementLimit, stockMovementType, stockMovementSearch, stockMovementStartDate, val);
                  }}
                  className="form-control bg-light border-0 p-2"
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Movement Type</label>
                <select
                  className="form-select bg-light border-0 p-2"
                  style={{ height: '38px' }}
                  value={stockMovementType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setStockMovementType(val);
                    setStockMovementPage(1);
                    loadStockMovements(1, stockMovementLimit, val, stockMovementSearch, stockMovementStartDate, stockMovementEndDate);
                  }}
                >
                  <option value="ALL">All (In & Out)</option>
                  <option value="STOCK_IN">Stock IN (+Purchases/Returns)</option>
                  <option value="STOCK_OUT">Stock OUT (-Sales/Losses)</option>
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Search Product / Reference / User</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control bg-light border-0 p-2"
                    placeholder="Search product, SKU, barcode, reason, or user..."
                    value={stockMovementSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStockMovementSearch(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFilter();
                    }}
                    style={{ height: '38px' }}
                  />
                  <button
                    className="btn btn-primary px-3 fw-bold"
                    style={{ backgroundColor: '#0d6efd', border: 'none' }}
                    onClick={handleFilter}
                  >
                    <i className="bi bi-search"></i>
                  </button>
                  <button
                    className="btn btn-outline-secondary px-2"
                    onClick={handleReset}
                    title="Reset Filters"
                  >
                    <i className="bi bi-arrow-counterclockwise"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card p-3 border-0 shadow-sm bg-white" style={{ borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-secondary fw-bold" style={{ fontSize: '0.8rem' }}>TOTAL INFLOW (+IN)</span>
                  <span className="badge bg-success-subtle text-success p-1.5 rounded-circle"><i className="bi bi-arrow-down-left"></i></span>
                </div>
                <h4 className="fw-bold text-success m-0">+{formatStock(stockMovementsSummary.totalInflow)}</h4>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>{stockMovementsSummary.inflowCount} Inflow Transactions</small>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card p-3 border-0 shadow-sm bg-white" style={{ borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-secondary fw-bold" style={{ fontSize: '0.8rem' }}>TOTAL OUTFLOW (-OUT)</span>
                  <span className="badge bg-danger-subtle text-danger p-1.5 rounded-circle"><i className="bi bi-arrow-up-right"></i></span>
                </div>
                <h4 className="fw-bold text-danger m-0">-{formatStock(stockMovementsSummary.totalOutflow)}</h4>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>{stockMovementsSummary.outflowCount} Outflow Transactions</small>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card p-3 border-0 shadow-sm bg-white" style={{ borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-secondary fw-bold" style={{ fontSize: '0.8rem' }}>NET MOVEMENT</span>
                  <span className="badge bg-primary-subtle text-primary p-1.5 rounded-circle"><i className="bi bi-plus-slash-minus"></i></span>
                </div>
                <h4 className={`fw-bold m-0 ${stockMovementsSummary.netMovement >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {stockMovementsSummary.netMovement >= 0 ? '+' : ''}{formatStock(stockMovementsSummary.netMovement)}
                </h4>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>Net Inventory Stock Impact</small>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card p-3 border-0 shadow-sm bg-white" style={{ borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-secondary fw-bold" style={{ fontSize: '0.8rem' }}>TOTAL EVENTS</span>
                  <span className="badge bg-secondary-subtle text-secondary p-1.5 rounded-circle"><i className="bi bi-receipt"></i></span>
                </div>
                <h4 className="fw-bold text-dark m-0">{stockMovementsSummary.totalRecords}</h4>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>Recorded Inflow/Outflow Logs</small>
              </div>
            </div>
          </div>

          {/* Audit Ledger Table */}
          <div className="card p-4 border-0 shadow-sm bg-white" style={{ borderRadius: '10px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 className="fw-bold m-0 text-dark">
                <i className="bi bi-journal-text text-primary me-2"></i> Stock Movement Audit Ledger
              </h5>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-success btn-sm fw-bold d-flex align-items-center gap-1 shadow-sm"
                  onClick={exportStockMovementsToCSV}
                  disabled={stockMovements.length === 0}
                >
                  <i className="bi bi-file-earmark-excel"></i> Export Excel (CSV)
                </button>
              </div>
            </div>

            <div className="table-responsive mb-3">
              <table className="table custom-table align-middle">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product & SKU</th>
                    <th>Movement Type</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Reason / Source Reference</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                      </td>
                    </tr>
                  ) : stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        <i className="bi bi-box-seam fs-1 d-block mb-2 text-secondary opacity-50"></i>
                        No stock movement logs found matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    stockMovements.map((item, idx) => (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-bold text-dark">{formatAdToBsShort(item.createdAt)}</div>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{item.product?.name || 'Unknown Product'}</div>
                          {item.product?.SKU && (
                            <span className="badge bg-light text-secondary border font-mono" style={{ fontSize: '0.72rem' }}>
                              {item.product.SKU}
                            </span>
                          )}
                        </td>
                        <td>
                          {item.type === 'STOCK_IN' ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1">
                              <i className="bi bi-arrow-down-left me-1"></i> +STOCK IN
                            </span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1">
                              <i className="bi bi-arrow-up-right me-1"></i> -STOCK OUT
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`fw-bold ${item.type === 'STOCK_IN' ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.95rem' }}>
                            {item.type === 'STOCK_IN' ? '+' : '-'}{formatStock(item.quantity)}
                          </span>
                        </td>
                        <td className="fw-medium text-secondary">{item.product?.unit || 'pcs'}</td>
                        <td>
                          <span className="badge bg-secondary-subtle text-dark border border-secondary-subtle px-2 py-1" style={{ fontSize: '0.78rem' }}>
                            {item.reason || 'General Movement'}
                          </span>
                          {item.supplier?.name && (
                            <div className="text-muted small mt-0.5" style={{ fontSize: '0.72rem' }}>
                              Supplier: {item.supplier.name}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <i className="bi bi-person-circle text-muted"></i>
                            <span className="fw-medium text-dark small">{item.user?.name || 'System'}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {stockMovementTotal > 0 && (
              <TableControls
                total={stockMovementTotal}
                currentPage={stockMovementPage}
                rowsPerPage={stockMovementLimit}
                onRowsPerPageChange={(n) => {
                  setStockMovementLimit(n);
                  setStockMovementPage(1);
                  loadStockMovements(1, n, stockMovementType, stockMovementSearch, stockMovementStartDate, stockMovementEndDate);
                }}
                onPageChange={(p) => {
                  setStockMovementPage(p);
                  loadStockMovements(p, stockMovementLimit, stockMovementType, stockMovementSearch, stockMovementStartDate, stockMovementEndDate);
                }}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'daily' && (
        <>
          {/* Top Filter Bar */}
          <div className="card border-0 rounded-md shadow-sm p-3 mb-4 bg-white" style={{ borderRadius: '10px' }}>
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>{t('reports', 'from_date')}</label>
                <BSDatePicker
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  className="form-control bg-light border-0 p-2"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>{t('reports', 'to_date')}</label>
                <BSDatePicker
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  className="form-control bg-light border-0 p-2"
                />
              </div>
              <div className="col-12 col-md-3">
                <button 
                  className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: '#0d6efd', borderRadius: '6px', height: '38px', border: 'none' }}
                  onClick={handleFilter}
                >
                  <i className="bi bi-funnel-fill"></i> {t('reports', 'filter_report') || 'Filter Report'}
                </button>
              </div>
              <div className="col-12 col-md-3">
                <button 
                  className="btn btn-outline-secondary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border bg-white text-secondary"
                  style={{ borderRadius: '6px', height: '38px' }}
                  onClick={handleReset}
                >
                  <i className="bi bi-arrow-counterclockwise"></i> {t('common', 'reset') || 'Reset'}
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
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>{t('reports', 'total_income') || 'Total Income (Sales)'}</div>
                    <div className="fw-bold text-success mb-1" style={{ fontSize: '1.25rem' }}>
                      Rs.{summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="card border-0 shadow-sm p-3 text-center bg-white" style={{ borderRadius: '10px' }}>
                    <div className="mb-2"><i className="bi bi-receipt fs-4 text-danger" style={{ color: '#dc3545' }}></i></div>
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>{t('reports', 'total_expenses') || 'Total Expenses'}</div>
                    <div className="fw-bold text-danger mb-1" style={{ fontSize: '1.25rem' }}>
                      Rs.{summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="card border-0 shadow-sm p-3 text-center bg-white" style={{ borderRadius: '10px' }}>
                    <div className="mb-2"><i className="bi bi-cart3 fs-4 text-warning" style={{ color: '#fd7e14' }}></i></div>
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>{t('reports', 'total_purchases') || 'Total Purchases'}</div>
                    <div className="fw-bold text-warning mb-1" style={{ fontSize: '1.25rem' }}>
                      Rs.{summary.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="card border-0 shadow-sm p-3 text-center bg-white" style={{ borderRadius: '10px' }}>
                    <div className="mb-2"><i className="bi bi-cash-coin fs-4" style={{ color: summary.netProfit < 0 ? '#dc3545' : '#198754' }}></i></div>
                    <div className="text-secondary mb-1" style={{ fontSize: '0.8rem', fontWeight: '500' }}>{t('reports', 'net_profit_loss') || 'Net Profit / Loss'}</div>
                    <div className="fw-bold mb-1" style={{ fontSize: '1.25rem', color: summary.netProfit < 0 ? '#dc3545' : '#198754' }}>
                      {summary.netProfit < 0 ? '-' : ''}Rs.{Math.abs(summary.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Row */}
              <div className="card border-0 shadow-sm p-4 mb-4 bg-white" style={{ borderRadius: '10px' }}>
                <h5 className="fw-bold text-dark mb-4"><i className="bi bi-bar-chart-line-fill text-primary me-2"></i> Income vs Expenses</h5>
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
          <h5 className="fw-bold text-dark mb-4 d-flex align-items-center gap-2">
            <i className="bi bi-box-seam text-primary"></i>
            {t('reports', 'closing_stock')} {closingStock?.fiscalYear ? `(FY ${closingStock.fiscalYear})` : ''}
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
                            <span className="badge bg-primary rounded-pill px-3 py-2">
                              {formatStock(p.closingQuantity)} {p.unit || ''}
                            </span>
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
          <h5 className="fw-bold text-dark mb-4 d-flex align-items-center gap-2">
            <i className="bi bi-wallet2 text-primary"></i>
            {t('reports', 'closing_balance')} {closingBalance?.fiscalYear ? `(FY ${closingBalance.fiscalYear})` : ''}
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

      {activeTab === 'deleted_sales' && (
        <div className="card border-0 rounded-md shadow-sm p-4 bg-white" style={{ borderRadius: '10px' }}>
          <h5 className="fw-bold text-dark mb-4 d-flex align-items-center gap-2">
            <i className="bi bi-trash text-danger"></i>
            {t('reports', 'deleted_sales')}
          </h5>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-danger" role="status"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="py-3 ps-3 text-secondary" style={{ fontSize: '0.85rem' }}>Invoice No</th>
                    <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>Customer</th>
                    <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>Amount</th>
                    <th className="py-3 text-secondary" style={{ fontSize: '0.85rem' }}>Deleted By (Admin ID)</th>
                    <th className="py-3 text-secondary text-end pe-3" style={{ fontSize: '0.85rem' }}>Deleted Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedSales.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">No deleted sales records found.</td></tr>
                  ) : (
                    deletedSales.map((sale: any) => (
                      <tr key={sale.id}>
                        <td className="ps-3 py-3 fw-semibold text-dark">{sale.invoiceNo}</td>
                        <td className="py-3 text-secondary">{sale.customerName || 'Walk-In'}</td>
                        <td className="py-3 fw-bold text-danger">Rs. {sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 text-secondary">Admin #{sale.deletedById}</td>
                        <td className="py-3 text-end pe-3 text-secondary">{new Date(sale.deletedAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Barcodes UI */}
      {activeTab === 'barcodes' && (
        <div className="card border-0 rounded-md shadow-sm p-4 bg-white" style={{ borderRadius: '10px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4 no-print">
            <h5 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
              <i className="bi bi-qr-code-scan text-primary"></i>
              Bulk Barcode Printing
            </h5>
            <button 
              className="btn btn-primary d-flex align-items-center gap-2 rounded-3 no-print shadow-sm px-4" 
              onClick={() => window.print()}
              disabled={selectedBarcodes.size === 0}
            >
              <i className="bi bi-printer-fill"></i> Print Selected ({selectedBarcodes.size})
            </button>
          </div>

          <div className="row mb-4 no-print">
            <div className="col-12 col-md-6 col-lg-4">
              <input 
                type="text" 
                className="form-control bg-light border-0 shadow-sm" 
                placeholder="Search products..." 
                value={barcodeSearch}
                onChange={e => setBarcodeSearch(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-8 d-flex align-items-center justify-content-md-end gap-3 mt-3 mt-md-0">
              <button 
                className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold"
                onClick={() => {
                  const filtered = products.filter(p => p.name.toLowerCase().includes(barcodeSearch.toLowerCase()) || (p.barcode || p.SKU).toLowerCase().includes(barcodeSearch.toLowerCase()));
                  setSelectedBarcodes(new Set(filtered.map(p => p.id)));
                }}
              >Select All</button>
              <button 
                className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-bold"
                onClick={() => setSelectedBarcodes(new Set())}
              >Clear All</button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5 no-print"><div className="spinner-border text-primary" role="status"></div></div>
          ) : (
            <div className="table-responsive no-print border rounded shadow-sm">
              <table className="table align-middle mb-0 custom-table">
                <thead className="bg-light">
                  <tr>
                    <th className="py-3 ps-3 text-secondary" style={{ width: '50px' }}></th>
                    <th className="py-3 text-secondary fw-bold">Product Name</th>
                    <th className="py-3 text-secondary fw-bold">Barcode / SKU</th>
                    <th className="py-3 text-secondary fw-bold text-end pe-3">Price</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {products.filter(p => p.name.toLowerCase().includes(barcodeSearch.toLowerCase()) || (p.barcode || p.SKU).toLowerCase().includes(barcodeSearch.toLowerCase())).map((prod: any) => (
                    <tr key={prod.id} className={selectedBarcodes.has(prod.id) ? 'table-primary bg-opacity-10' : ''}>
                      <td className="ps-3 py-3">
                        <div className="form-check m-0">
                          <input 
                            type="checkbox" 
                            className="form-check-input border-secondary" 
                            style={{ width: '1.2rem', height: '1.2rem' }}
                            checked={selectedBarcodes.has(prod.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedBarcodes);
                              if (e.target.checked) newSet.add(prod.id);
                              else newSet.delete(prod.id);
                              setSelectedBarcodes(newSet);
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 fw-semibold text-dark">{prod.name}</td>
                      <td className="py-3 text-secondary"><span className="font-monospace bg-light rounded px-2 py-1 border">{prod.barcode || prod.SKU}</span></td>
                      <td className="py-3 text-end pe-3 fw-bold text-dark">Rs. {Number(prod.price).toFixed(2)}</td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-5 text-muted">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Hidden Print Area */}
          <div className="print-only">
            <div className="barcode-grid">
              {products.filter(p => selectedBarcodes.has(p.id)).map((prod, index) => (
                <div key={`${prod.id}-${index}`} className="barcode-item">
                  <div className="barcode-name">{prod.name}</div>
                  <div className="barcode-category">{prod.category?.name || 'Store'}</div>
                  <Barcode value={prod.barcode || prod.SKU || 'UNKNOWN'} width={1.5} height={40} fontSize={12} margin={5} />
                  <div className="barcode-price">Rs. {Number(prod.price).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-only, .print-only * {
            visibility: visible;
          }
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .barcode-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            width: 100%;
            padding: 10px;
          }
          .barcode-item {
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
          .barcode-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .barcode-category {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          .barcode-price {
            font-size: 14px;
            font-weight: bold;
            margin-top: 5px;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
    </AuthLayout>
  );
}
