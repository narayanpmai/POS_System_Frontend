'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import AuthLayout from '@/components/AuthLayout';

export default function AccountingDashboard() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'trial_balance' | 'journal_entries'>('trial_balance');
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <AuthLayout>
      <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>📊 {t('accounting', 'title') || 'Accounting Dashboard'}</h2>
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'trial_balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('trial_balance')}
          >
            {t('accounting', 'trial_balance') || 'Trial Balance'}
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'journal_entries' ? 'active' : ''}`}
            onClick={() => setActiveTab('journal_entries')}
          >
            {t('accounting', 'journal_entries') || 'Journal Entries'}
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : activeTab === 'trial_balance' ? (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t('accounting', 'code') || 'Code'}</th>
                  <th>{t('accounting', 'account_name') || 'Account Name'}</th>
                  <th>{t('accounting', 'type') || 'Type'}</th>
                  <th className="text-end">{t('accounting', 'debit') || 'Debit (Dr)'}</th>
                  <th className="text-end">{t('accounting', 'credit') || 'Credit (Cr)'}</th>
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
                  )
                })}
              </tbody>
              <tfoot className="table-light fw-bold">
                <tr>
                  <td colSpan={3} className="text-end">{t('accounting', 'total') || 'Total:'}</td>
                  <td className="text-end text-primary">Rs. {totalDebit.toFixed(2)}</td>
                  <td className="text-end text-success">Rs. {totalCredit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="accordion" id="journalAccordion">
          {journalEntries.map((entry, index) => (
            <div className="accordion-item mb-2 border-0 shadow-sm rounded" key={entry.id}>
              <h2 className="accordion-header">
                <button className={`accordion-button ${index !== 0 ? 'collapsed' : ''} rounded`} type="button" data-bs-toggle="collapse" data-bs-target={`#collapse${entry.id}`}>
                  <div className="d-flex justify-content-between w-100 me-3">
                    <strong>{entry.referenceNo || 'JE-' + entry.id} - {entry.description}</strong>
                    <span className="text-muted">{new Date(entry.date).toLocaleDateString()}</span>
                  </div>
                </button>
              </h2>
              <div id={`collapse${entry.id}`} className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`} data-bs-parent="#journalAccordion">
                <div className="accordion-body p-0">
                  <table className="table table-sm table-borderless mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>{t('accounting', 'account') || 'Account'}</th>
                        <th>{t('accounting', 'description') || 'Description'}</th>
                        <th className="text-end">{t('accounting', 'debit') || 'Debit'}</th>
                        <th className="text-end">{t('accounting', 'credit') || 'Credit'}</th>
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
            <div className="text-center py-5 text-muted">{t('accounting', 'no_entries') || 'No journal entries found.'}</div>
          )}
        </div>
      )}
    </div>
    </AuthLayout>
  );
}
