'use client';

import React, { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth, FiscalYear } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull, toDevanagari } from '@/utils/nepaliDate';
import BSDatePicker from '@/components/BSDatePicker';

export default function FiscalYearsPage() {
  const { api, refreshFiscalYear, loading: authLoading, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchFiscalYears();
    }
  }, [authLoading, isAuthenticated]);

  const fetchFiscalYears = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fiscal-years');
      setFiscalYears(res.data);
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

        {/* 1-CLICK QUICK NEPALI FY SETUP BANNER */}
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
                  <i className="bi bi-lightning-charge-fill me-1"></i> {language === 'ne' ? '१-क्लिक छिटो सेटअप' : '1-Click Quick Setup'}
                </span>
                <h5 className="fw-bold mb-1">
                  {language === 'ne' ? 'नेपाली आर्थिक वर्ष १-क्लिकमा सक्रिय गर्नुहोस्' : 'Quick Activate Nepali Fiscal Year'}
                </h5>
                <p className="text-white-50 small mb-0">
                  {language === 'ne'
                    ? 'मितिहरू आफैँ नछानी तलको बटन थिचेर एक सेकेन्डमै चालु आर्थिक वर्ष सुरु गर्नुहोस्।'
                    : 'No need to select dates manually. Click a button below to activate instant fiscal year.'}
                </p>
              </div>

              <div className="d-flex flex-wrap gap-2">
                {/* 2081/082 - RECOMMENDED */}
                <button
                  type="button"
                  className="btn btn-warning fw-bold px-4 py-2 text-dark shadow-sm d-flex align-items-center hover-lift"
                  style={{ borderRadius: '12px', border: '2px solid rgba(255,255,255,0.4)' }}
                  onClick={() => handleQuickSetup('२०८१/०८२', '2024-07-16', '2025-07-15', true)}
                  disabled={quickLoading !== null}
                >
                  {quickLoading === '२०८१/०८२' ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-star-fill me-2 text-danger"></i>
                  )}
                  {language === 'ne' ? '२०८१/०८२ सक्रिय गर्नुहोस् (चालु वर्ष)' : 'Activate 2081/082 (Current)'}
                </button>

                {/* 2082/083 - UPCOMING */}
                <button
                  type="button"
                  className="btn btn-light fw-bold px-3 py-2 text-dark shadow-sm d-flex align-items-center hover-lift"
                  style={{ borderRadius: '12px' }}
                  onClick={() => handleQuickSetup('२०८२/०८३', '2025-07-16', '2026-07-15', true)}
                  disabled={quickLoading !== null}
                >
                  {quickLoading === '२०८२/०८३' ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-calendar-plus me-2 text-primary"></i>
                  )}
                  {language === 'ne' ? '२०८२/०८३ सेट गर्नुहोस् (आगामी)' : 'Activate 2082/083 (Next)'}
                </button>

                {/* 2080/081 - PREVIOUS */}
                <button
                  type="button"
                  className="btn btn-outline-light fw-bold px-3 py-2 shadow-sm d-flex align-items-center hover-lift"
                  style={{ borderRadius: '12px' }}
                  onClick={() => handleQuickSetup('२०८०/०८१', '2023-07-17', '2024-07-15', true)}
                  disabled={quickLoading !== null}
                >
                  {quickLoading === '२०८०/०८१' ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-clock-history me-2"></i>
                  )}
                  {language === 'ne' ? '२०८०/०८१ (पुरानो वर्ष)' : '2080/081 (Prev)'}
                </button>
              </div>
            </div>
          </div>
        </div>

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
                    <i className="bi bi-info-circle-fill me-1"></i> {fiscalYears.length} {language === 'ne' ? 'वटा वर्षहरू' : 'Records'}
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
                              {language === 'ne' ? 'कुनै आर्थिक वर्ष फेला परेन' : 'No fiscal years found'}
                            </h5>
                            <p className="small text-secondary mb-4">
                              {language === 'ne'
                                ? 'प्रणालीमा बिक्री र रिपोर्टिङ सुरु गर्न कम्तीमा एउटा चालु आर्थिक वर्ष सक्रिय हुनुपर्छ।'
                                : 'Create your first fiscal year or activate one instantly below:'}
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary btn-lg rounded-pill px-4 py-2 shadow fw-bold hover-lift"
                              onClick={() => handleQuickSetup('२०८१/०८२', '2024-07-16', '2025-07-15', true)}
                              disabled={quickLoading !== null}
                            >
                              <i className="bi bi-lightning-charge-fill me-2 text-warning"></i>
                              {language === 'ne'
                                ? '✨ १-क्लिकमा चालु आर्थिक वर्ष (२०८१/०८२) सक्रिय गर्नुहोस्'
                                : '✨ 1-Click Activate Current FY (२०८१/०८२)'}
                            </button>
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
                                {fy.isActive ? (
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
                                  {!fy.isActive && (
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
              </div>
            </div>
          </div>
        </div>
      </div>

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
