'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth, FiscalYear } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull, toDevanagari } from '@/utils/nepaliDate';
import BSDatePicker from '@/components/BSDatePicker';
import TableControls from '@/components/TableControls';

export default function FiscalYearsPage() {
  const { api, refreshFiscalYear, loading: authLoading, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [totalFiscalYears, setTotalFiscalYears] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  // Fiscal Year Rollover Wizard States
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverStep, setRolloverStep] = useState<1 | 2 | 3>(1);
  const [selectedFyForRollover, setSelectedFyForRollover] = useState<FiscalYear | null>(null);
  const [rolloverSummary, setRolloverSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [nextFyName, setNextFyName] = useState('');
  const [nextFyStart, setNextFyStart] = useState('');
  const [nextFyEnd, setNextFyEnd] = useState('');
  const [isRollingOver, setIsRollingOver] = useState(false);

  const openRolloverWizard = async (fy: FiscalYear) => {
    setSelectedFyForRollover(fy);
    setRolloverStep(1);
    setShowRolloverModal(true);
    setLoadingSummary(true);

    // Auto calculate next FY dates (e.g. 2083/84 -> 2084/85)
    const yearParts = fy.name.split('/');
    if (yearParts.length === 2) {
      const y1 = parseInt(yearParts[0], 10) + 1;
      const y2 = (parseInt(yearParts[1], 10) + 1).toString().padStart(2, '0');
      setNextFyName(`${y1}/${y2}`);
    } else {
      setNextFyName('New Fiscal Year');
    }

    try {
      const res = await api.get(`/fiscal-years/${fy.id}/rollover-summary`);
      setRolloverSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch rollover summary', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleExecuteRollover = async () => {
    if (!selectedFyForRollover) return;
    try {
      setIsRollingOver(true);
      await api.post(`/fiscal-years/${selectedFyForRollover.id}/close`, {
        name: nextFyName,
        startDate: nextFyStart || new Date().toISOString().split('T')[0],
        endDate: nextFyEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      alert(language === 'ne' ? 'आर्थिक वर्ष सफलतापूर्वक बन्द र प्रारम्भिक स्टक स्थानान्तरण गरियो!' : 'Fiscal Year successfully closed and opening stock carried forward!');
      setShowRolloverModal(false);
      fetchFiscalYears();
      refreshFiscalYear();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete Fiscal Year rollover');
    } finally {
      setIsRollingOver(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchFiscalYears();
    }
  }, [authLoading, isAuthenticated, currentPage, rowsPerPage]);

  const fetchFiscalYears = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/fiscal-years?page=${currentPage}&limit=${rowsPerPage}`);
      setFiscalYears(res.data?.items || res.data || []);
      setTotalFiscalYears(res.data?.total || (Array.isArray(res.data) ? res.data.length : 0));
    } catch (err: any) {
      console.error('Failed to load fiscal years:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    try {
      setIsSubmitting(true);
      if (editingId) {
        await api.put(`/fiscal-years/${editingId}`, {
          name,
          startDate,
          endDate
        });
        alert(language === 'ne' ? 'आर्थिक वर्ष सफलतापूर्वक अपडेट गरियो!' : 'Fiscal Year updated successfully!');
      } else {
        await api.post('/fiscal-years', {
          name,
          startDate,
          endDate,
          isActive: false
        });
        alert(language === 'ne' ? 'नयाँ आर्थिक वर्ष सफलतापूर्वक सिर्जना गरियो!' : 'Fiscal Year created successfully!');
      }
      resetForm();
      fetchFiscalYears();
      refreshFiscalYear();
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ne' ? 'त्रुटि भयो' : 'Error saving fiscal year'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-Click Nepali FY Setup
  const handleQuickSetup = async (fyName: string, startAd: string, endAd: string, makeActive: boolean = true) => {
    try {
      setQuickLoading(fyName);
      const existing = fiscalYears.find(f => f.name === fyName);
      let targetId = existing?.id;

      if (!targetId) {
        const res = await api.post('/fiscal-years', {
          name: fyName,
          startDate: startAd,
          endDate: endAd,
          isActive: makeActive
        });
        targetId = res.data.id;
      } else if (makeActive) {
        await api.put(`/fiscal-years/${targetId}/set-active`);
      }

      alert(
        language === 'ne'
          ? `आर्थिक वर्ष ${fyName} सफलतापूर्वक ${makeActive ? 'सक्रिय गरियो!' : 'सिर्जना गरियो!'}`
          : `Fiscal Year ${fyName} ${makeActive ? 'set as active successfully!' : 'created successfully!'}`
      );
      await fetchFiscalYears();
      await refreshFiscalYear();
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ne' ? 'आर्थिक वर्ष सेट गर्न असफल भयो' : 'Failed to setup fiscal year'));
    } finally {
      setQuickLoading(null);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setStartDate('');
    setEndDate('');
  };

  const handleEdit = (fy: FiscalYear) => {
    setEditingId(fy.id);
    setName(fy.name);
    setStartDate(fy.startDate.split('T')[0]);
    setEndDate(fy.endDate.split('T')[0]);
  };

  const handleDelete = async (id: number) => {
    const msg = language === 'ne'
      ? 'के तपाईं यो आर्थिक वर्ष मेटाउन निश्चित हुनुहुन्छ?'
      : 'Are you sure you want to delete this Fiscal Year?';
    if (!window.confirm(msg)) return;

    try {
      await api.delete(`/fiscal-years/${id}`);
      alert(language === 'ne' ? 'आर्थिक वर्ष सफलतापूर्वक मेटाइयो!' : 'Fiscal Year deleted successfully!');
      fetchFiscalYears();
      refreshFiscalYear();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting fiscal year');
    }
  };

  const handleSetActive = async (id: number, fyName: string) => {
    try {
      await api.put(`/fiscal-years/${id}/set-active`);
      alert(language === 'ne' ? `आर्थिक वर्ष ${fyName} सक्रिय गरियो!` : `Fiscal Year ${fyName} set as active!`);
      await fetchFiscalYears();
      await refreshFiscalYear();
    } catch (err: any) {
      alert('Failed to set active fiscal year');
    }
  };

  // Helper to format BS Date cleanly
  const renderBsDate = (adDateStr: string) => {
    const adOnly = adDateStr.split('T')[0];
    const bsFull = formatAdToBsFull(adOnly);
    const bsPart = bsFull.split('-')[0]?.trim() || adOnly;
    return {
      bs: bsPart,
      ad: adOnly
    };
  };

  return (
    <AuthLayout>
      <div className="container-fluid px-4 py-4 animate-fade-in-up">
        {/* Top Header Section */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
          <div>
            <h3 className="fw-bold m-0 text-dark" style={{ fontFamily: 'var(--font-heading)' }}>
              <i className="bi bi-calendar-range me-2 text-primary"></i>
              {language === 'ne' ? 'आर्थिक वर्ष व्यवस्थापन (Fiscal Years)' : t('fiscal_years', 'title') || 'Fiscal Year Settings'}
            </h3>
            <p className="text-secondary mt-1 mb-0">
              {language === 'ne'
                ? 'प्रणालीमा बिक्री, खरिद र सम्पूर्ण रिपोर्टिङका लागि चालु आर्थिक वर्ष सक्रिय गर्नुहोस्।'
                : 'Manage and set active fiscal years for sales, inventory and reporting.'}
            </p>
          </div>
        </div>

        {/* CURRENT ACTIVE FISCAL YEAR BANNER */}
        {(() => {
          const activeFY = fiscalYears.find((fy) => fy.isActive);
          return (
            <div
              className="card border-0 shadow-lg mb-4 text-white overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1c3b70 100%)',
                borderRadius: '16px'
              }}
            >
              <div className="card-body p-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold mb-2 shadow-sm">
                      <i className="bi bi-shield-check me-1"></i>
                      {language === 'ne' ? 'सक्रिय स्थिति' : 'Active Status'}
                    </span>
                    <h5 className="fw-bold mb-1">
                      {language === 'ne' ? 'चालु सक्रिय आर्थिक वर्ष' : 'Current Active Fiscal Year'}
                    </h5>
                    <p className="text-white-50 small mb-0">
                      {language === 'ne'
                        ? 'प्रणालीमा बिक्री, खरिद र सम्पूर्ण रिपोर्टिङका लागि हाल सक्रिय रहेको आर्थिक वर्ष।'
                        : 'Fiscal year currently active in the system for all transactions and reporting.'}
                    </p>
                  </div>

                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    {activeFY ? (
                      <>
                        <div
                          className="p-3 px-4 d-flex align-items-center gap-3 shadow-sm"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '16px'
                          }}
                        >
                          <div
                            className="bg-success text-white rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: '48px', height: '48px', flexShrink: 0 }}
                          >
                            <i className="bi bi-check-lg fs-3"></i>
                          </div>
                          <div>
                            <div className="text-warning fw-bold small text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                              {language === 'ne' ? 'चालु सक्रिय आर्थिक वर्ष' : 'ACTIVE FISCAL YEAR'}
                            </div>
                            <div className="fs-4 fw-bold text-white mb-0" style={{ lineHeight: '1.2' }}>
                              {activeFY.name}
                            </div>
                            <div className="small text-white-50 mt-1 d-flex align-items-center gap-1">
                              <i className="bi bi-calendar3 me-1"></i>
                              {renderBsDate(activeFY.startDate).bs} — {renderBsDate(activeFY.endDate).bs}
                            </div>
                          </div>
                        </div>

                        {!(activeFY as any).isClosed && (
                          <button
                            type="button"
                            className="btn btn-warning fw-bold px-4 py-3 shadow d-flex align-items-center gap-2 hover-lift"
                            style={{ borderRadius: '14px', border: 'none' }}
                            onClick={() => openRolloverWizard(activeFY)}
                          >
                            <i className="bi bi-arrow-repeat fs-5"></i>
                            <div>
                              <div style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>
                                {language === 'ne' ? 'आर्थिक वर्ष बन्द तथा रोलओभर' : 'Close & Rollover FY'}
                              </div>
                              <small className="text-dark opacity-75" style={{ fontSize: '0.72rem' }}>
                                {language === 'ne' ? 'स्टक स्थानान्तरण विमर्ष' : 'Stock Carryforward Wizard'}
                              </small>
                            </div>
                          </button>
                        )}
                      </>
                    ) : (
                      <div
                        className="p-3 px-4 d-flex align-items-center gap-3 shadow-sm"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px dashed rgba(255, 255, 255, 0.4)',
                          borderRadius: '16px'
                        }}
                      >
                        <div
                          className="bg-danger text-white rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm"
                          style={{ width: '44px', height: '44px', flexShrink: 0 }}
                        >
                          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                        </div>
                        <div>
                          <div className="text-warning fw-bold small text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                            {language === 'ne' ? 'कुनै आर्थिक वर्ष सक्रिय छैन' : 'NO ACTIVE FISCAL YEAR'}
                          </div>
                          <div className="small text-white-50 mt-1">
                            {language === 'ne' ? 'तलको तालिकाबाट आर्थिक वर्ष सक्रिय गर्नुहोस्।' : 'Please activate a fiscal year from the table below.'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="row g-4">
          {/* Add / Edit Form Section (Left) */}
          <div className="col-lg-4 animate-slide-in-right animate-delay-100">
            <div className="stat-card h-100 stat-card-blue border-0 shadow-lg" style={{ overflow: 'visible' }}>
              <div className="d-flex align-items-center mb-3">
                <div className="stat-card-icon mb-0 me-3 shadow-sm">
                  <i className={`bi ${editingId ? 'bi-pencil-square' : 'bi-plus-lg'}`}></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                    {editingId
                      ? (language === 'ne' ? 'आर्थिक वर्ष सम्पादन गर्नुहोस्' : 'Edit Fiscal Year')
                      : (language === 'ne' ? 'नयाँ आर्थिक वर्ष थप्नुहोस्' : 'Add Fiscal Year')}
                  </h5>
                  <p className="text-secondary small mb-0">
                    {language === 'ne' ? 'मिति राखेर अनुकूल आर्थिक वर्ष बनाउनुहोस्' : 'Create custom fiscal year period'}
                  </p>
                </div>
              </div>

              <hr className="border-secondary opacity-10 my-4" />

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    {language === 'ne' ? 'आर्थिक वर्षको नाम *' : 'FY Name *'}
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg shadow-sm border-0 bg-light"
                    placeholder={language === 'ne' ? 'जस्तै: २०८१/०८२' : 'e.g. 2081/082'}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    {language === 'ne' ? 'सुरु मिति (BS/AD) *' : 'Start Date *'}
                  </label>
                  <div className="shadow-sm rounded bg-light p-1">
                    <BSDatePicker
                      value={startDate}
                      onChange={(date) => setStartDate(date)}
                    />
                  </div>
                  {startDate && (
                    <div className="small text-muted mt-1">
                      <i className="bi bi-calendar-check me-1 text-primary"></i>
                      {formatAdToBsFull(startDate)}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    {language === 'ne' ? 'अन्त्य मिति (BS/AD) *' : 'End Date *'}
                  </label>
                  <div className="shadow-sm rounded bg-light p-1">
                    <BSDatePicker
                      value={endDate}
                      onChange={(date) => setEndDate(date)}
                    />
                  </div>
                  {endDate && (
                    <div className="small text-muted mt-1">
                      <i className="bi bi-calendar-check me-1 text-success"></i>
                      {formatAdToBsFull(endDate)}
                    </div>
                  )}
                </div>

                <div className="d-flex gap-3 mt-5">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1 py-2 text-white fw-bold d-flex align-items-center justify-content-center shadow"
                    disabled={isSubmitting}
                    style={{ borderRadius: '12px' }}
                  >
                    {isSubmitting ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status"></span> {language === 'ne' ? 'सेभ हुँदैछ...' : 'Saving...'}</>
                    ) : (
                      <>
                        <i className={`bi ${editingId ? 'bi-check2-circle' : 'bi-plus-circle'} me-2`}></i>
                        {editingId
                          ? (language === 'ne' ? 'अपडेट गर्नुहोस्' : 'Update FY')
                          : (language === 'ne' ? 'सुरक्षित गर्नुहोस्' : 'Save Fiscal Year')}
                      </>
                    )}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-light shadow-sm py-2 fw-bold text-secondary border hover-opacity"
                      onClick={resetForm}
                      disabled={isSubmitting}
                      style={{ borderRadius: '12px' }}
                    >
                      {language === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* List Section (Right) */}
          <div className="col-lg-8 animate-slide-in-right animate-delay-200">
            <div className="card border-0 shadow-lg h-100" style={{ background: 'var(--light-card)', borderRadius: 'var(--radius-lg)' }}>
              <div className="card-body p-4 p-xl-5">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h5 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      {language === 'ne' ? 'आर्थिक वर्षहरूको सूची' : 'Fiscal Years List'}
                    </h5>
                    <p className="text-secondary small mb-0">
                      {language === 'ne' ? 'एक समयमा एउटा मात्र आर्थिक वर्ष सक्रिय हुन सक्छ।' : 'Only one fiscal year can be active at a time.'}
                    </p>
                  </div>
                  <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold border border-primary border-opacity-25 shadow-sm">
                    <i className="bi bi-calendar-event me-1"></i> {fiscalYears.length} {language === 'ne' ? 'आर्थिक वर्षहरू' : 'Total FYs'}
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table custom-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th className="rounded-start">{language === 'ne' ? 'आर्थिक वर्ष' : 'FY Name'}</th>
                        <th>{language === 'ne' ? 'सुरु मिति (BS)' : 'Start Date (BS/AD)'}</th>
                        <th>{language === 'ne' ? 'अन्त्य मिति (BS)' : 'End Date (BS/AD)'}</th>
                        <th>{language === 'ne' ? 'स्थिति' : 'Status'}</th>
                        <th className="text-end rounded-end">{language === 'ne' ? 'कार्य' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="border-top-0">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2 text-secondary small fw-medium">
                              {language === 'ne' ? 'आर्थिक वर्ष लोड हुँदैछ...' : 'Fetching fiscal years...'}
                            </p>
                          </td>
                        </tr>
                      ) : fiscalYears.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-5 text-muted">
                            <div className="p-4 bg-light rounded-circle d-inline-block mb-3 shadow-sm border">
                              <i className="bi bi-calendar-x fs-1 text-primary opacity-75"></i>
                            </div>
                            <h5 className="fw-bold text-dark">
                              {language === 'ne' ? 'कुनै आर्थिक वर्ष भेटिएन' : 'No fiscal year found'}
                            </h5>
                            <p className="small text-secondary mb-4">
                              {language === 'ne'
                                ? 'प्रणालीमा बिक्री र रिपोर्टिङ सुरु गर्न कम्तीमा एउटा आर्थिक वर्ष सिर्जना गर्नुहोस्।'
                                : 'Create your first fiscal year on the left form:'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        fiscalYears.map((fy) => {
                          const startFormatted = renderBsDate(fy.startDate);
                          const endFormatted = renderBsDate(fy.endDate);

                          return (
                            <tr
                              key={fy.id}
                              className="hover-highlight"
                              style={{
                                transition: 'background-color 0.2s',
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: fy.isActive ? 'rgba(13, 110, 253, 0.04)' : 'transparent'
                              }}
                            >
                              <td className="fw-bold text-dark py-3">
                                <div className="d-flex align-items-center">
                                  <div
                                    className={`rounded px-2 py-1 me-3 fw-bold small shadow-sm border ${
                                      fy.isActive
                                        ? 'bg-success bg-opacity-10 text-success border-success'
                                        : 'bg-primary bg-opacity-10 text-primary border-primary'
                                    }`}
                                  >
                                    FY
                                  </div>
                                  <span style={{ fontSize: '1.05rem' }}>{fy.name}</span>
                                </div>
                              </td>

                              <td className="py-3">
                                <div className="fw-bold text-dark">
                                  <i className="bi bi-calendar3 me-2 text-primary"></i>
                                  {startFormatted.bs}
                                </div>
                                <div className="small text-muted">{startFormatted.ad}</div>
                              </td>

                              <td className="py-3">
                                <div className="fw-bold text-dark">
                                  <i className="bi bi-calendar3-fill me-2 text-success"></i>
                                  {endFormatted.bs}
                                </div>
                                <div className="small text-muted">{endFormatted.ad}</div>
                              </td>

                              <td className="py-3">
                                {(fy as any).isClosed ? (
                                  <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-3 py-2 fw-bold shadow-sm d-inline-flex align-items-center">
                                    <i className="bi bi-lock-fill me-1"></i>
                                    {language === 'ne' ? '🔒 बन्द (Closed)' : '🔒 Closed'}
                                  </span>
                                ) : fy.isActive ? (
                                  <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2 fw-bold shadow-sm d-inline-flex align-items-center">
                                    <span className="p-1 bg-success rounded-circle me-2" style={{ width: '8px', height: '8px' }}></span>
                                    {language === 'ne' ? 'सक्रिय (चालु वर्ष)' : 'Active (Current)'}
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-3 py-2 fw-medium d-inline-flex align-items-center">
                                    <span className="p-1 bg-secondary rounded-circle me-2 opacity-50" style={{ width: '8px', height: '8px' }}></span>
                                    {language === 'ne' ? 'निष्क्रिय' : 'Inactive'}
                                  </span>
                                )}
                              </td>

                              <td className="text-end py-3">
                                <div className="d-flex justify-content-end align-items-center gap-2">
                                  {fy.isActive && !(fy as any).isClosed && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-warning text-dark fw-bold rounded-pill px-3 py-1 d-inline-flex align-items-center hover-lift shadow-sm"
                                      onClick={() => openRolloverWizard(fy)}
                                      title="Close & Rollover Fiscal Year"
                                    >
                                      <i className="bi bi-arrow-repeat me-1 text-primary"></i>
                                      {language === 'ne' ? 'रोलओभर / बन्द गर्नुहोस्' : 'Close & Rollover'}
                                    </button>
                                  )}

                                  {!fy.isActive && !(fy as any).isClosed && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-success fw-bold rounded-pill px-3 py-1 d-inline-flex align-items-center hover-lift shadow-sm"
                                      onClick={() => handleSetActive(fy.id, fy.name)}
                                      title="Set Active"
                                    >
                                      <i className="bi bi-check-circle-fill me-1"></i>
                                      {language === 'ne' ? 'सक्रिय गर्नुहोस्' : 'Set Active'}
                                    </button>
                                  )}

                                  <button
                                    className="btn btn-sm btn-light border shadow-sm rounded-circle hover-lift"
                                    onClick={() => handleEdit(fy)}
                                    title="Edit"
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <i className="bi bi-pencil-fill text-primary"></i>
                                  </button>

                                  {!fy.isActive && (
                                    <button
                                      className="btn btn-sm btn-light border shadow-sm rounded-circle hover-lift"
                                      onClick={() => handleDelete(fy.id)}
                                      title="Delete"
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      <i className="bi bi-trash-fill text-danger"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <TableControls
                  total={totalFiscalYears}
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-STEP FISCAL YEAR ROLLOVER WIZARD MODAL */}
      {showRolloverModal && selectedFyForRollover && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-arrow-repeat fs-4"></i>
                  <div>
                    <h5 className="modal-title fw-bold m-0">Fiscal Year Rollover Wizard</h5>
                    <small className="opacity-75">Closing Period: {selectedFyForRollover.name}</small>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRolloverModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {/* Step Progress Bar */}
                <div className="d-flex justify-content-between mb-4 position-relative">
                  <div className={`step-item ${rolloverStep >= 1 ? 'active text-primary fw-bold' : 'text-muted'}`}>
                    <span className="badge rounded-circle me-1 bg-primary text-white">1</span> Financial Audit
                  </div>
                  <div className={`step-item ${rolloverStep >= 2 ? 'active text-primary fw-bold' : 'text-muted'}`}>
                    <span className="badge rounded-circle me-1 bg-primary text-white">2</span> Next Period Setup
                  </div>
                  <div className={`step-item ${rolloverStep >= 3 ? 'active text-primary fw-bold' : 'text-muted'}`}>
                    <span className="badge rounded-circle me-1 bg-primary text-white">3</span> Confirm Stock Rollover
                  </div>
                </div>

                {/* STEP 1: FINANCIAL AUDIT SUMMARY */}
                {rolloverStep === 1 && (
                  <div>
                    <h6 className="fw-bold text-dark mb-3">Step 1: Period Financial & Inventory Summary</h6>
                    {loadingSummary ? (
                      <div className="text-center py-5">
                        <span className="spinner-border text-primary"></span>
                        <p className="small text-muted mt-2">Calculating financial balances...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="row g-3 mb-4">
                          <div className="col-6 col-md-3">
                            <div className="p-3 bg-light rounded-3 text-center border">
                              <div className="small text-muted fw-semibold">Total Sales</div>
                              <div className="fs-5 fw-bold text-success">Rs. {rolloverSummary?.totalSales?.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-3">
                            <div className="p-3 bg-light rounded-3 text-center border">
                              <div className="small text-muted fw-semibold">Total Purchases</div>
                              <div className="fs-5 fw-bold text-danger">Rs. {rolloverSummary?.totalPurchases?.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-3">
                            <div className="p-3 bg-light rounded-3 text-center border">
                              <div className="small text-muted fw-semibold">Operating Expenses</div>
                              <div className="fs-5 fw-bold text-warning">Rs. {rolloverSummary?.totalExpenses?.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-3">
                            <div className="p-3 bg-light rounded-3 text-center border">
                              <div className="small text-muted fw-semibold">Net Period Profit</div>
                              <div className={`fs-5 fw-bold ${rolloverSummary?.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                Rs. {rolloverSummary?.netProfit?.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="alert alert-info d-flex align-items-center gap-3 rounded-3">
                          <i className="bi bi-box-seam fs-3 text-info"></i>
                          <div>
                            <div className="fw-bold">Active Inventory Valuation</div>
                            <div className="small">
                              {rolloverSummary?.totalProductsCount} products in catalog with total asset value of{' '}
                              <strong>Rs. {rolloverSummary?.totalInventoryValue?.toLocaleString()}</strong> will be carried forward.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: NEXT PERIOD SETUP */}
                {rolloverStep === 2 && (
                  <div>
                    <h6 className="fw-bold text-dark mb-3">Step 2: Define Next Fiscal Year Details</h6>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Next Fiscal Year Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={nextFyName}
                        onChange={(e) => setNextFyName(e.target.value)}
                        placeholder="e.g. 2084/85"
                        required
                      />
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Start Date (BS)</label>
                        <BSDatePicker
                          value={nextFyStart}
                          onChange={setNextFyStart}
                          className="form-control"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">End Date (BS)</label>
                        <BSDatePicker
                          value={nextFyEnd}
                          onChange={setNextFyEnd}
                          className="form-control"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: FINAL CONFIRMATION */}
                {rolloverStep === 3 && (
                  <div>
                    <div className="alert alert-warning border-warning rounded-3 p-3 mb-4">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
                        <h6 className="fw-bold m-0 text-dark">Lock & Carryforward Confirmation</h6>
                      </div>
                      <p className="small text-dark m-0">
                        Closing <strong>{selectedFyForRollover.name}</strong> will lock its financial ledger permanently.
                        All inventory stock levels will be snapshotted and carried forward into <strong>{nextFyName}</strong> as Opening Stock.
                      </p>
                    </div>

                    <div className="p-3 bg-light rounded-3 border">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Closing FY:</span>
                        <span className="fw-bold text-danger">{selectedFyForRollover.name} (🔒 Lock)</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Next Active FY:</span>
                        <span className="fw-bold text-success">{nextFyName} (✨ Active)</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Products Stock Transferred:</span>
                        <span className="fw-bold text-dark">{rolloverSummary?.totalProductsCount} catalog items</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={() => {
                    if (rolloverStep > 1) setRolloverStep((s) => (s - 1) as any);
                    else setShowRolloverModal(false);
                  }}
                >
                  {rolloverStep === 1 ? 'Cancel' : 'Back'}
                </button>

                {rolloverStep < 3 ? (
                  <button
                    type="button"
                    className="btn btn-primary rounded-pill px-4 fw-bold"
                    onClick={() => setRolloverStep((s) => (s + 1) as any)}
                    disabled={loadingSummary}
                  >
                    Next Step <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-success rounded-pill px-4 fw-bold"
                    onClick={handleExecuteRollover}
                    disabled={isRollingOver}
                  >
                    {isRollingOver ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span> Executing Rollover...</>
                    ) : (
                      <><i className="bi bi-check-circle-fill me-1"></i> Confirm & Execute Rollover</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hover-highlight:hover {
          background-color: rgba(13, 110, 253, 0.05) !important;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
        }
      `}</style>
    </AuthLayout>
  );
}
