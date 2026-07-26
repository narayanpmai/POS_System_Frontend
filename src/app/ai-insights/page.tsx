'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import AuthLayout from '@/components/AuthLayout';

// Unit conversion factors relative to category base unit (Base units: Grams for weight, ml for volume, Pcs for count)
const UNIT_FACTORS: Record<
  string,
  { category: 'weight' | 'volume' | 'count'; factorInBase: number; labelNe: string; labelEn: string }
> = {
  // Weight (Base: Grams)
  kg: { category: 'weight', factorInBase: 1000, labelNe: 'किलोग्राम (Kg)', labelEn: 'Kilogram (Kg)' },
  gram: { category: 'weight', factorInBase: 1, labelNe: 'ग्राम (Gram)', labelEn: 'Gram (g)' },
  dharni: { category: 'weight', factorInBase: 2500, labelNe: 'धार्नी (२.५ Kg)', labelEn: 'Dharni (2.5 Kg)' },
  pau: { category: 'weight', factorInBase: 200, labelNe: 'पाउ (२०० Gram)', labelEn: 'Pau (200g)' },
  quintal: { category: 'weight', factorInBase: 100000, labelNe: 'क्विन्टल (१०० Kg)', labelEn: 'Quintal (100 Kg)' },

  // Volume (Base: ml)
  liter: { category: 'volume', factorInBase: 1000, labelNe: 'लीटर (Liter)', labelEn: 'Liter (L)' },
  ml: { category: 'volume', factorInBase: 1, labelNe: 'मिलीलीटर (ml)', labelEn: 'Milliliter (ml)' },

  // Count (Base: Pcs)
  dozen: { category: 'count', factorInBase: 12, labelNe: 'दर्जन (१२ Pcs)', labelEn: 'Dozen (12 Pcs)' },
  pcs: { category: 'count', factorInBase: 1, labelNe: 'थान / पिस (Pcs)', labelEn: 'Piece (Pcs)' },
  carton24: { category: 'count', factorInBase: 24, labelNe: 'कार्टुन (२४ Pcs)', labelEn: 'Carton (24 Pcs)' }
};

export default function AiInsightsPage() {
  const { api } = useAuth();
  const { language } = useLanguage();
  const [salesPred, setSalesPred] = useState<any>(null);
  const [reorder, setReorder] = useState<any[]>([]);
  const [slowMoving, setSlowMoving] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Unit Converter States
  const [basePrice, setBasePrice] = useState<string>('250');
  const [baseQty, setBaseQty] = useState<string>('1');
  const [baseUnit, setBaseUnit] = useState<string>('kg');

  const [targetQty, setTargetQty] = useState<string>('250');
  const [targetUnit, setTargetUnit] = useState<string>('gram');

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

  const handleBaseUnitChange = (newUnit: string) => {
    setBaseUnit(newUnit);
    const category = UNIT_FACTORS[newUnit]?.category;
    if (category === 'weight') setTargetUnit('gram');
    else if (category === 'volume') setTargetUnit('ml');
    else if (category === 'count') setTargetUnit('pcs');
  };

  // Perform Real-Time Price & Unit Calculation
  const bPrice = parseFloat(basePrice) || 0;
  const bQty = parseFloat(baseQty) || 1;
  const tQty = parseFloat(targetQty) || 0;

  const baseFactor = UNIT_FACTORS[baseUnit]?.factorInBase || 1;
  const targetFactor = UNIT_FACTORS[targetUnit]?.factorInBase || 1;

  const totalBaseUnitsInSource = bQty * baseFactor;
  const pricePerBaseUnit = totalBaseUnitsInSource > 0 ? bPrice / totalBaseUnitsInSource : 0;

  const totalBaseUnitsInTarget = tQty * targetFactor;
  const calculatedPrice = pricePerBaseUnit * totalBaseUnitsInTarget;

  // Per unit summary rate
  let perUnitSummary = '';
  const cat = UNIT_FACTORS[baseUnit]?.category;
  if (cat === 'weight') {
    const pricePer100g = pricePerBaseUnit * 100;
    const pricePer1g = pricePerBaseUnit;
    perUnitSummary = `१००g = Rs. ${pricePer100g.toFixed(2)} | १g = Rs. ${pricePer1g.toFixed(2)}`;
  } else if (cat === 'volume') {
    const pricePer100ml = pricePerBaseUnit * 100;
    const pricePer1ml = pricePerBaseUnit;
    perUnitSummary = `१००ml = Rs. ${pricePer100ml.toFixed(2)} | १ml = Rs. ${pricePer1ml.toFixed(2)}`;
  } else {
    const pricePerPcs = pricePerBaseUnit;
    perUnitSummary = `१ थान/Pcs = Rs. ${pricePerPcs.toFixed(2)}`;
  }

  const getPresetsForCategory = (category?: 'weight' | 'volume' | 'count') => {
    if (category === 'weight') {
      return [
        { label: '१०० ग्राम (100g)', qty: 100, unit: 'gram' },
        { label: '२५० ग्राम (पाउ)', qty: 250, unit: 'gram' },
        { label: '५०० ग्राम (आधा Kg)', qty: 500, unit: 'gram' },
        { label: '१ धार्नी', qty: 1, unit: 'dharni' }
      ];
    } else if (category === 'volume') {
      return [
        { label: '१०० ml', qty: 100, unit: 'ml' },
        { label: '२५० ml (पाउ)', qty: 250, unit: 'ml' },
        { label: '५०० ml (आधा L)', qty: 500, unit: 'ml' }
      ];
    } else {
      return [
        { label: '१ थान (1 Pcs)', qty: 1, unit: 'pcs' },
        { label: '६ थान (आधा दर्जन)', qty: 6, unit: 'pcs' },
        { label: '१२ थान (१ दर्जन)', qty: 1, unit: 'dozen' }
      ];
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
      <div className="container-fluid py-4 animate-fade-in-up">
        <h3 className="mb-4 fw-bold text-dark" style={{ fontFamily: 'var(--font-heading)' }}>
          🤖 {language === 'ne' ? 'एआई अन्तर्दृष्टि र परिमाण क्याल्कुलेटर' : 'AI Insights & Predictions'}
        </h3>

        <div className="row mb-4 g-4">
          {/* Sales Prediction Card */}
          <div className="col-lg-4">
            <div
              className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: '#ffffff' }}
            >
              <div className="card-body p-4 d-flex flex-column justify-content-between text-center">
                <div>
                  <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold mb-3 shadow-sm">
                    <i className="bi bi-graph-up-arrow me-1"></i> {language === 'ne' ? '३० दिने अनुमान' : '30 Days Forecast'}
                  </span>
                  <h6 className="text-white-50 fw-bold mb-2">
                    {language === 'ne' ? 'बिक्री अनुमान (आगामी ३० दिन)' : 'Sales Prediction (Next 30 Days)'}
                  </h6>
                  <h2 className="fw-bold text-white mb-2" style={{ fontSize: '2rem' }}>
                    Rs. {salesPred?.predictedNext30Days?.toFixed(2) || '0.00'}
                  </h2>
                  <p className="text-warning fw-bold mb-0">
                    <i className="bi bi-graph-up-arrow me-1"></i>
                    {salesPred?.trend || 'UP'} ({((salesPred?.confidence || 0.85) * 100).toFixed(0)}% {language === 'ne' ? 'विश्वासनीयता' : 'Confidence'})
                  </p>
                </div>
                <div className="pt-3 border-top border-white border-opacity-10 mt-3">
                  <small className="text-white-50">
                    {language === 'ne' ? 'अघिल्लो ३० दिनको बिक्री:' : 'Based on previous 30 days:'} Rs. {salesPred?.last30Days?.toFixed(2) || '0.00'}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Unit Converter & Per Unit Price Calculator */}
          <div className="col-lg-8">
            <div
              className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
            >
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '38px', height: '38px' }}
                  >
                    <i className="bi bi-calculator-fill fs-5"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.05rem' }}>
                      {language === 'ne' ? 'प्रति इकाई मूल्य तथा परिमाण क्याल्कुलेटर' : 'Unit Price & Quantity Calculator'}
                    </h5>
                    <small className="text-secondary">
                      {language === 'ne'
                        ? '१ Kg को मूल्यबाट ग्राम, एमएल वा थानको खद्रा हिसाब गर्नुहोस्'
                        : 'Instant conversion & unit price calculation (Kg ↔ Gram ↔ Liter ↔ Pcs)'}
                    </small>
                  </div>
                </div>
                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-1 fw-bold">
                  ⚡ {language === 'ne' ? 'छिटो हिसाब' : 'Instant Calc'}
                </span>
              </div>

              <div className="card-body p-4">
                {/* Inputs Row */}
                <div className="row g-3">
                  {/* Base Price & Qty */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark small">
                      {language === 'ne' ? '१. मुख्य मूल्य र परिमाण (Base Price & Qty):' : '1. Base Price & Quantity:'}
                    </label>
                    <div className="input-group shadow-sm">
                      <span className="input-group-text bg-light text-secondary fw-bold">Rs.</span>
                      <input
                        type="number"
                        className="form-control fw-bold text-dark"
                        placeholder="250"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-control text-center fw-bold"
                        style={{ maxWidth: '75px' }}
                        value={baseQty}
                        onChange={(e) => setBaseQty(e.target.value)}
                      />
                      <select
                        className="form-select fw-semibold bg-light"
                        value={baseUnit}
                        onChange={(e) => handleBaseUnitChange(e.target.value)}
                      >
                        {Object.entries(UNIT_FACTORS).map(([key, u]) => (
                          <option key={key} value={key}>
                            {language === 'ne' ? u.labelNe : u.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <small className="text-muted mt-1 d-block">
                      {language === 'ne' ? 'उदा: रु २५० मा १ Kg' : 'Example: Rs 250 for 1 Kg'}
                    </small>
                  </div>

                  {/* Target Qty & Unit */}
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark small">
                      {language === 'ne' ? '२. हिसाब गर्नुपर्ने परिमाण (Target Qty):' : '2. Target Quantity to Calculate:'}
                    </label>
                    <div className="input-group shadow-sm">
                      <input
                        type="number"
                        className="form-control fw-bold text-primary fs-5"
                        placeholder="250"
                        value={targetQty}
                        onChange={(e) => setTargetQty(e.target.value)}
                      />
                      <select
                        className="form-select fw-semibold bg-light"
                        value={targetUnit}
                        onChange={(e) => setTargetUnit(e.target.value)}
                      >
                        {Object.entries(UNIT_FACTORS)
                          .filter(([_, u]) => u.category === UNIT_FACTORS[baseUnit]?.category)
                          .map(([key, u]) => (
                            <option key={key} value={key}>
                              {language === 'ne' ? u.labelNe : u.labelEn}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Quick Presets */}
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      <span className="small text-muted me-1 align-self-center">{language === 'ne' ? 'छिटो परिमाण:' : 'Quick:'}</span>
                      {getPresetsForCategory(UNIT_FACTORS[baseUnit]?.category).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0 px-2 rounded-pill shadow-xs hover-lift"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => {
                            setTargetQty(String(preset.qty));
                            setTargetUnit(preset.unit);
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Result Display Box */}
                <div className="mt-4 p-3 px-4 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-25 d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <div className="text-primary fw-bold text-uppercase small" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                      {language === 'ne' ? '📊 हिसाब गरिएको कुल मूल्य' : '📊 CALCULATED TOTAL PRICE'}
                    </div>
                    <div className="fs-2 fw-bold text-dark mb-0" style={{ lineHeight: '1.2' }}>
                      Rs. {calculatedPrice.toFixed(2)}
                    </div>
                    <div className="small text-secondary mt-1">
                      <i className="bi bi-arrow-right-circle me-1 text-primary"></i>
                      {baseQty} {language === 'ne' ? UNIT_FACTORS[baseUnit]?.labelNe : UNIT_FACTORS[baseUnit]?.labelEn} = Rs. {basePrice} ➔ {targetQty} {language === 'ne' ? UNIT_FACTORS[targetUnit]?.labelNe : UNIT_FACTORS[targetUnit]?.labelEn} = <strong className="text-primary fs-6">Rs. {calculatedPrice.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="bg-white p-3 px-4 rounded-3 shadow-sm border text-end" style={{ minWidth: '180px' }}>
                    <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                      {language === 'ne' ? 'प्रति इकाई दर (Unit Rate)' : 'Per Unit Rate'}
                    </div>
                    <div className="fw-bold text-success fs-6 mt-1">
                      {perUnitSummary}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
                <h5 className="fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {language === 'ne' ? 'पुन: अर्डर सुझावहरू' : 'Reorder Suggestions'}
                </h5>
              </div>
              <div className="card-body">
                {reorder.length === 0 ? (
                  <p className="text-muted text-center py-4">
                    {language === 'ne' ? 'मौज्दात स्थिति स्वस्थ छ।' : 'Inventory levels are healthy.'}
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-borderless">
                      <thead className="table-light">
                        <tr>
                          <th>{language === 'ne' ? 'सामग्री' : 'Product'}</th>
                          <th>{language === 'ne' ? 'हालको मौज्दात' : 'Stock'}</th>
                          <th>{language === 'ne' ? 'सुझाव परिमाण' : 'Suggested Qty'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reorder.map((r) => (
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
                <h5 className="fw-bold text-warning">
                  <i className="bi bi-hourglass-bottom me-2"></i>
                  {language === 'ne' ? 'सुस्त बिक्री हुने वस्तुहरू' : 'Slow Moving Stock'}
                </h5>
              </div>
              <div className="card-body">
                {slowMoving.length === 0 ? (
                  <p className="text-muted text-center py-4">
                    {language === 'ne' ? 'कुनै सुस्त बिक्री हुने वस्तुहरू भेटिएनन्।' : 'No slow moving products detected.'}
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-borderless">
                      <thead className="table-light">
                        <tr>
                          <th>{language === 'ne' ? 'सामग्री' : 'Product'}</th>
                          <th>{language === 'ne' ? 'मौज्दात' : 'Stock'}</th>
                          <th>{language === 'ne' ? 'सुझाव' : 'Suggestion'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slowMoving.slice(0, 5).map((s) => (
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
