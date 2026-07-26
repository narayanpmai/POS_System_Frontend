'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/AuthLayout';
import { formatAdToBs } from '@/utils/nepaliDate';

export default function AccountingDashboard() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState<'trial_balance' | 'journal_entries'>('trial_balance');
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const tabTitle = activeTab === 'trial_balance' ? 'Trial Balance' : 'Journal Entries';

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
          <div class="subtitle">Printed on: ${formatAdToBs(new Date())}</div>
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
          <div class="subtitle">Downloaded on: ${formatAdToBs(new Date())}</div>
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
          <th>Code</th>
          <th>Account Name</th>
          <th>Type</th>
          <th className="text-end">Debit (Dr)</th>
          <th className="text-end">Credit (Cr)</th>
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
          <td colSpan={3} className="text-end">Total:</td>
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
                <th>Account</th>
                <th>Description</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Credit</th>
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
      {journalEntries.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No journal entries found.</p>}
    </div>
  );

  return (
    <AuthLayout>
      <div className="p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h2 className="m-0">📊 Accounting Dashboard</h2>
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-outline-secondary d-flex align-items-center gap-2 fw-semibold"
              style={{ borderRadius: '8px' }}
              onClick={handlePrint}
              title={`Print ${tabTitle}`}
            >
              <i className="bi bi-printer-fill"></i> Print {tabTitle}
            </button>
            <button
              className="btn btn-outline-danger d-flex align-items-center gap-2 fw-semibold"
              style={{ borderRadius: '8px' }}
              onClick={handleDownloadPDF}
              title={`Download ${tabTitle} as PDF`}
            >
              <i className="bi bi-file-earmark-pdf-fill"></i> Download PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'trial_balance' ? 'active' : ''}`}
              onClick={() => setActiveTab('trial_balance')}
            >
              Trial Balance
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'journal_entries' ? 'active' : ''}`}
              onClick={() => setActiveTab('journal_entries')}
            >
              Journal Entries
            </button>
          </li>
        </ul>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
        ) : activeTab === 'trial_balance' ? (
          <>
            {/* Printable hidden ref for Trial Balance */}
            <div ref={printRef} style={{ display: 'none' }}>
              {renderTrialBalancePrintable()}
            </div>
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Account Name</th>
                      <th>Type</th>
                      <th className="text-end">Debit (Dr)</th>
                      <th className="text-end">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.map(acc => {
                      const isDebit = acc.type === 'ASSET' || acc.type === 'EXPENSE';
                      return (
                        <tr key={acc.id}>
                          <td>{acc.code}</td>
                          <td>{acc.name}</td>
                          <td><span className="badge bg-secondary">{acc.type}</span></td>
                          <td className="text-end">{isDebit && acc.balance > 0 ? `Rs. ${acc.balance.toFixed(2)}` : '-'}</td>
                          <td className="text-end">{!isDebit && acc.balance > 0 ? `Rs. ${acc.balance.toFixed(2)}` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td colSpan={3} className="text-end">Total:</td>
                      <td className="text-end text-primary">Rs. {totalDebit.toFixed(2)}</td>
                      <td className="text-end text-success">Rs. {totalCredit.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Printable hidden ref for Journal Entries */}
            <div ref={printRef} style={{ display: 'none' }}>
              {renderJournalPrintable()}
            </div>
            <div className="accordion" id="journalAccordion">
              {journalEntries.map((entry, index) => (
                <div className="accordion-item mb-2 border-0 shadow-sm rounded" key={entry.id}>
                  <h2 className="accordion-header">
                    <button className={`accordion-button ${index !== 0 ? 'collapsed' : ''} rounded`} type="button" data-bs-toggle="collapse" data-bs-target={`#collapse${entry.id}`}>
                      <div className="d-flex justify-content-between w-100 me-3">
                        <strong>{entry.referenceNo || 'JE-' + entry.id} - {entry.description}</strong>
                        <span className="text-muted">{formatAdToBs(entry.date)}</span>
                      </div>
                    </button>
                  </h2>
                  <div id={`collapse${entry.id}`} className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`} data-bs-parent="#journalAccordion">
                    <div className="accordion-body p-0">
                      <table className="table table-sm table-borderless mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Account</th>
                            <th>Description</th>
                            <th className="text-end">Debit</th>
                            <th className="text-end">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line: any) => (
                            <tr key={line.id}>
                              <td>{line.account.code} - {line.account.name}</td>
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
                <div className="text-center py-5 text-muted">No journal entries found.</div>
              )}
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
