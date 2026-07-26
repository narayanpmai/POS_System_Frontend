'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatAdToBsFull } from '@/utils/nepaliDate';
import TableControls, { applyPagination } from '@/components/TableControls';

export default function SalesReturnsPage() {
  const router = useRouter();
  const { token, api } = useAuth();
  const { t, language } = useLanguage();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // New return form
  const [showModal, setShowModal] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState([{ saleItemId: '', quantity: 1 }]);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales-returns');
      setReturns(res.data || []);
    } catch (err) {
      console.error('Error fetching sales returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        saleId: Number(saleId),
        reason,
        items: items.map(item => ({
          saleItemId: Number(item.saleItemId),
          quantity: Number(item.quantity)
        }))
      };
      await api.post('/sales-returns', payload);
      alert(language === 'ne' ? 'फिर्ता सफलतापूर्वक प्रशोधन गरियो!' : 'Return processed successfully!');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || (language === 'ne' ? 'फिर्ता प्रशोधन गर्दा त्रुटि भयो' : 'Error processing return'));
    }
  };

  const addItemRow = () => {
    setItems([...items, { saleItemId: '', quantity: 1 }]);
  };

  const removeItemRow = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  return (
    <AuthLayout>
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => router.back()} title={t('common', 'back')}>
              <i className="bi bi-arrow-left"></i> {t('common', 'back')}
            </button>
            <h2 className="text-dark fw-bold m-0">
              <i className="bi bi-receipt-cutoff text-danger me-2"></i>
              {language === 'ne' ? 'बिक्री फिर्ता' : 'Sales Returns'}
            </h2>
          </div>
          <button className="btn btn-danger shadow-sm rounded-pill px-4" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-circle me-2"></i> {language === 'ne' ? 'फिर्ता सिर्जना गर्नुहोस्' : 'Create Return'}
          </button>
        </div>

        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{language === 'ne' ? 'फिर्ता नं.' : 'Return No'}</th>
                  <th>{language === 'ne' ? 'बिल नं.' : 'Invoice No'}</th>
                  <th>{t('common', 'date')}</th>
                  <th>{language === 'ne' ? 'कारण' : 'Reason'}</th>
                  <th>{language === 'ne' ? 'कुल फिर्ता' : 'Total Refund'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">{t('common', 'loading')}</td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">{language === 'ne' ? 'कुनै फिर्ता फेला परेन' : 'No returns found'}</td>
                  </tr>
                ) : (
                  applyPagination(returns, currentPage, rowsPerPage).map((ret) => (
                    <tr key={ret.id}>
                      <td className="fw-bold">{ret.returnNo}</td>
                      <td>{ret.sale?.invoiceNo || '-'}</td>
                      <td>
                        <div className="small text-muted">{new Date(ret.returnDate).toLocaleDateString()}</div>
                        <div className="small text-primary">{formatAdToBsFull(new Date(ret.returnDate))}</div>
                      </td>
                      <td>{ret.reason || '-'}</td>
                      <td className="fw-bold text-danger">Rs. {ret.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TableControls
            total={returns.length}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content border-0 shadow rounded-4">
                <div className="modal-header border-bottom-0 bg-light rounded-top-4">
                  <h5 className="modal-title fw-bold text-dark">{language === 'ne' ? 'बिक्री फिर्ता प्रशोधन' : 'Process Sales Return'}</h5>
                  <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={handleCreateReturn}>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-semibold">{language === 'ne' ? 'बिक्री ID' : 'Sale ID (Internal ID)'}</label>
                        <input
                          type="number" step="any" className="form-control rounded-3"
                          value={saleId}
                          onChange={(e) => setSaleId(e.target.value)}
                          required
                        />
                        <small className="text-muted">{language === 'ne' ? 'बिक्रीको डेटाबेस ID दिनुहोस्' : 'Enter the database ID of the sale'}</small>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small fw-semibold">{language === 'ne' ? 'कारण' : 'Reason'}</label>
                        <input
                          type="text"
                          className="form-control rounded-3"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder={language === 'ne' ? 'उदा: बिग्रिएको सामान' : 'e.g. Defective item'}
                        />
                      </div>
                    </div>

                    <h6 className="fw-bold mt-4 mb-3">{language === 'ne' ? 'फिर्ता वस्तुहरू' : 'Return Items'}</h6>
                    {items.map((item, index) => (
                      <div className="row g-2 mb-2 align-items-center" key={index}>
                        <div className="col-md-5">
                          <input
                            type="number" step="any" className="form-control rounded-3"
                            placeholder="Sale Item ID"
                            value={item.saleItemId}
                            onChange={(e) => updateItem(index, 'saleItemId', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-5">
                          <input
                            type="number" step="any" className="form-control rounded-3"
                            placeholder="Quantity to Return"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            min="1"
                            required
                          />
                        </div>
                        <div className="col-md-2 text-end">
                          <button
                            type="button"
                            className="btn btn-outline-danger rounded-3"
                            onClick={() => removeItemRow(index)}
                            disabled={items.length === 1}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill mt-2 mb-4" onClick={addItemRow}>
                      <i className="bi bi-plus"></i> {language === 'ne' ? 'वस्तु थप्नुहोस्' : 'Add Item'}
                    </button>

                    <div className="text-end border-top pt-3 mt-2">
                      <button type="button" className="btn btn-light rounded-pill px-4 me-2" onClick={() => setShowModal(false)}>
                        {t('common', 'cancel')}
                      </button>
                      <button type="submit" className="btn btn-danger rounded-pill px-4">
                        {language === 'ne' ? 'फिर्ता प्रशोधन गर्नुहोस्' : 'Process Return'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
