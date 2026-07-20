'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import axios from 'axios';
import Link from 'next/link';
import { formatAdToBs, formatAdToBsShort } from '@/utils/nepaliDate';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SummaryData {
  salesCountToday: number;
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  totalSales: number;
  totalTaxCollected: number;
  totalDiscountGiven: number;
  totalTransactions: number;
  totalNetProfit: number;
  lowStockCount: number;
  lowStockAlerts: any[];
  topSellingProducts: any[];
  recentTransactions: any[];
}

interface ChartTimelineItem {
  date: string;
  sales: number;
  profit: number;
  transactions: number;
}

export default function DashboardPage() {
  const { token, api, activeFiscalYear } = useAuth();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [chartData, setChartData] = useState<ChartTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchSummary = async () => {
      try {
        const res = await api.get('/reports/dashboard-summary');
        setSummary(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
        setLoading(false);
      }
    };

    const fetchSalesTimeline = async () => {
      try {
        const res = await api.get('/reports/sales');
        setChartData(res.data.timeline || []);
        setChartLoading(false);
      } catch (err) {
        console.error('Error fetching sales timeline:', err);
        setChartLoading(false);
      }
    };

    fetchSummary();
    fetchSalesTimeline();
  }, [token, activeFiscalYear]);

  // Chart configuration
  const lineChartData = {
    labels: chartData.map((d) => {
      return formatAdToBsShort(d.date);
    }),
    datasets: [
      {
        label: t('dashboard', 'today_revenue'),
        data: chartData.map((d) => d.sales),
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        borderWidth: 2,
        tension: 0.4, // Smooth curve
        fill: true,
        pointBackgroundColor: '#0d6efd',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        cornerRadius: 8,
        titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
      },
    },
    scales: {
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Plus Jakarta Sans' } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans' } },
      },
    },
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading telemetry...</span>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {/* 1. Stat Grid */}
      <div className="row g-4 mb-4 animate-fade-in-up">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card stat-card-blue h-100 text-center animate-fade-in-up animate-delay-100">
            <span className="text-secondary fw-semibold d-block mb-2">{t('dashboard', 'today_sales')}</span>
            <h3 className="m-0 fw-bold" style={{ color: 'var(--primary)' }}>Rs. {summary?.salesToday.toFixed(2) || '0.00'}</h3>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card stat-card-orange h-100 text-center animate-fade-in-up animate-delay-200">
            <span className="text-secondary fw-semibold d-block mb-2">{t('dashboard', 'this_month')}</span>
            <h3 className="m-0 fw-bold" style={{ color: 'var(--secondary)' }}>Rs. {summary?.salesThisMonth?.toFixed(2) || summary?.salesThisWeek.toFixed(2) || '0.00'}</h3>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card stat-card-blue h-100 text-center animate-fade-in-up animate-delay-300">
            <span className="text-secondary fw-semibold d-block mb-2">{t('dashboard', 'profit')}</span>
            <h3 className="m-0 fw-bold" style={{ color: 'var(--primary)' }}>Rs. {summary?.totalNetProfit.toFixed(2) || '0.00'}</h3>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card stat-card stat-card-orange h-100 text-center animate-fade-in-up animate-delay-400">
            <span className="text-secondary fw-semibold d-block mb-2">{t('dashboard', 'today_revenue')}</span>
            <h3 className="m-0 fw-bold" style={{ color: 'var(--secondary)' }}>Rs. {summary?.totalSales?.toFixed(2) || summary?.salesThisMonth?.toFixed(2) || '0.00'}</h3>
          </div>
        </div>
      </div>

      {/* 2. Interactive Charts & Timeline */}
      <div className="row g-4 mb-4 animate-fade-in-up animate-delay-200">
        <div className="col-12 col-xl-8">
          <div className="card stat-card h-100 border-0 p-4">
            <h6 className="fw-semibold text-secondary mb-4">{t('dashboard', 'sales_trend')}</h6>
            <div style={{ height: '350px' }}>
              {chartLoading ? (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : (
                <Line data={lineChartData} options={chartOptions} />
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card stat-card h-100 border-0 p-4">
            <h6 className="fw-semibold text-danger mb-4 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle"></i> {t('dashboard', 'low_stock_items')}
            </h6>
            
            <div className="d-flex flex-column gap-3 mt-4 text-center">
              {(!summary?.lowStockAlerts || summary.lowStockAlerts.length === 0) ? (
                <p className="text-secondary fw-semibold mt-5">{t('common', 'no_data')}</p>
              ) : (
                summary.lowStockAlerts.map((prod, idx) => (
                  <div key={idx} className="d-flex align-items-center justify-content-between p-2 border-bottom">
                    <span className="fw-semibold text-dark">{prod.name}</span>
                    <span className="badge bg-danger-subtle text-danger px-2 py-1 rounded-pill">{prod.stock} {t('common', 'stock')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tables Row */}
      <div className="row g-4 animate-fade-in-up animate-delay-300">
        {/* Recent Transactions */}
        <div className="col-12">
          <div className="card stat-card border-0 p-4">
            <h6 className="fw-semibold text-secondary mb-4">{t('dashboard', 'recent_sales')}</h6>
            <div className="table-responsive">
              <table className="table custom-table m-0">
                <thead>
                  <tr>
                    <th>{t('sales', 'invoice_no')}</th>
                    <th>{t('common', 'date')}</th>
                    <th>{t('common', 'customer')}</th>
                    <th>{t('common', 'amount')}</th>
                    <th>{t('common', 'status')}</th>
                    <th>{t('common', 'payment_method')}</th>
                    <th>{t('common', 'actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.recentTransactions.length === 0 ? (
                    <tr>
                       <td colSpan={7} className="text-center text-muted py-4">{t('dashboard', 'no_recent_sales')}</td>
                    </tr>
                  ) : (
                    summary?.recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="fw-bold text-dark">{tx.invoiceNo}</td>
                        <td>{formatAdToBs(tx.createdAt)}</td>
                        <td>{tx.customer?.name || t('sales', 'walk_in_customer')}</td>
                        <td className="fw-bold">Rs. {tx.totalAmount.toFixed(2)}</td>
                        <td><span className="badge bg-success-subtle text-success border border-success px-2 py-1 rounded-pill">{t('common', 'paid')}</span></td>
                        <td>{tx.paymentMethod}</td>
                        <td><button className="btn btn-sm btn-light border px-3"><i className="bi bi-eye"></i></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
