'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/AuthLayout';
import { formatAdToBs } from '@/utils/nepaliDate';
import { useLanguage } from '@/context/LanguageContext';
import TableControls, { applyPagination } from '@/components/TableControls';

export default function AccountingDashboard() {
  const router = useRouter();
  const { api } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'trial_balance' | 'journal_entries'>('trial_balance');
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'trial_balance') {
        const res = await api.get('/accounting/trial-balance');
        setTrialBalance(res.data);
      } else {
        const res = await api.get('/accounting/journal-entries');
        setJournalEntries(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = trialBalance.reduce((sum, acc) => sum + (acc.balance > 0 && (acc.type === 'ASSET' || acc.type === 'EXPENSE') ? acc.balance : 0), 0);
  const totalCredit = trialBalance.reduce((sum, acc) => sum + (acc.balance > 0 && (acc.type === 'LIABILITY' || acc.type === 'REVENUE' || acc.type === 'EQUITY') ? acc.balance : 0), 0);

  const tabTitle = activeTab === 'trial_balance' ? t('accounting', 'trial_balance') : t('accounting', 'journal_entries');

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${tabTitle}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
            h2 { margin-bottom: 4px; }
            .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.85rem; }
            th { background: #f0f4f8; padding: 8px 10px; text-align: left; border-bottom: 2px solid #ddd; }
            td { padding: 7px 10px; border-bottom: 1px solid #eee; }
            .text-end { text-align: right; }
            .badge { background: #6c757d; color: #fff; border-radius: 4px; padding: 2px 7px; font-size: 0.75rem; }
            tfoot td { font-weight: bold; background: #f8f9fa; border-top: 2px solid #ccc; }
            .je-block { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
            .je-header { background: #f0f4f8; padding: 8px 12px; font-weight: bold; display: flex; justify-content: space-between; }
            .je-date { color: #666; font-size: 0.85rem; }
            @media print { body { padding: 8px; } }
          </style>
        </head>
        <body>
          <h2>${tabTitle}</h2>
          <div class="subtitle">${t('common', 'printed_on')}: ${formatAdToBs(new Date())}</div>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  const handleDownloadPDF = async () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
            h2 { margin-bottom: 4px; }
            .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.85rem; }
            th { background: #f0f4f8; padding: 8px 10px; text-align: left; border-bottom: 2px solid #ddd; }
            td { padding: 7px 10px; border-bottom: 1px solid #eee; }
            .text-end { text-align: right; }
            .badge { background: #6c757d; color: #fff; border-radius: 4px; padding: 2px 7px; font-size: 0.75rem; }
            tfoot td { font-weight: bold; background: #f8f9fa; border-top: 2px solid #ccc; }
            .je-block { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
            .je-header { background: #f0f4f8; padding: 8px 12px; font-weight: bold; display: flex; justify-content: space-between; }
            .je-date { color: #666; font-size: 0.85rem; }
          </style>
        </head>
        <body>
          <h2>${tabTitle}</h2>
          <div class="subtitle">${t('common', 'downloaded_on')}: ${formatAdToBs(new Date())}</div>
          ${printContent}
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tabTitle.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTrialBalancePrintable = () => (
    <table>
      <thead>
        <tr>
          <th>{t('accounting', 'code')}</th>
          <th>{t('accounting', 'account_name')}</th>
          <th>{t('accounting', 'type')}</th>
          <th className="text-end">{t('accounting', 'debit')}</th>
          <th className="text-end">{t('accounting', 'credit')}</th>
        </tr>
      </thead>
      <tbody>
        {trialBalance.map(acc => {
          const isDebit = acc.type === 'ASSET' || acc.type === 'EXPENSE';
          return (
            <tr key={acc.id}>
              <td>{acc.code}</td>
              <td>{acc.name}</td>
              <td><span className="badge">{acc.type}</span></td>
              <td className="text-end">{isDebit && acc.balance > 0 ? `Rs. ${acc.balance.toFixed(2)}` : '-'}</td>
              <td className="text-end">{!isDebit && acc.balance > 0 ? `Rs. ${acc.balance.toFixed(2)}` : '-'}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="text-end">{t('accounting', 'total')}:</td>
          <td className="text-end">Rs. {totalDebit.toFixed(2)}</td>
          <td className="text-end">Rs. {totalCredit.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  );

  const renderJournalPrintable = () => (
    <div>
      {journalEntries.map(entry => (
        <div className="je-block" key={entry.id}>
          <div className="je-header">
            <span>{entry.referenceNo || 'JE-' + entry.id} — {entry.description}</span>
            <span className="je-date">{formatAdToBs(entry.date)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>{t('accounting', 'account')}</th>
                <th>{t('accounting', 'description')}</th>
                <th className="text-end">{t('accounting', 'debit')}</th>
                <th className="text-end">{t('accounting', 'credit')}</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line: any) => (
                <tr key={line.id}>
                  <td>{line.account.code} - {line.account.name}</td>
                  <td>{line.description}</td>
                  <td className="text-end">{line.debit > 0 ? `Rs. ${line.debit.toFixed(2)}` : ''}</td>
                  <td className="text-end">{line.credit > 0 ? `Rs. ${line.credit.toFixed(2)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {journalEntries.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>{t('accounting', 'no_entries')}</p>}
    </div>
  );

  return (
    <AuthLayout>
      <div className="p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title={t('common', 'back')}>
              <i className="bi bi-arrow-left"></i> {t('common', 'back')}
            </button>
            <h2 className="m-0">📊 {t('accounting', 'title')}</h2>
                              <td>{line.description}</td>
                              <td className="text-end text-primary">{line.debit > 0 ? `Rs. ${line.debit.toFixed(2)}` : ''}</td>
                              <td className="text-end text-success">{line.credit > 0 ? `Rs. ${line.credit.toFixed(2)}` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
              {journalEntries.length === 0 && (
                <div className="text-center py-5 text-muted">{t('accounting', 'no_entries')}</div>
              )}
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
