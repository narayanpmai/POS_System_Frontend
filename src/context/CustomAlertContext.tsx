'use client';

import React, { createContext, useContext, useState } from 'react';

type AlertType = 'warning' | 'error' | 'success' | 'info';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  isConfirm?: boolean;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface CustomAlertContextType {
  showAlert: (message: string, title?: string, type?: AlertType) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    title?: string,
    confirmText?: string,
    type?: AlertType
  ) => void;
}

const CustomAlertContext = createContext<CustomAlertContextType | undefined>(undefined);

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (message: string, title = 'Notice', type: AlertType = 'warning') => {
    setAlert({
      isOpen: true,
      title,
      message,
      type,
      isConfirm: false,
    });
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    title = 'Confirm Action',
    confirmText = 'Yes, Proceed',
    type: AlertType = 'warning'
  ) => {
    setAlert({
      isOpen: true,
      title,
      message,
      type,
      isConfirm: true,
      onConfirm,
      confirmText,
      cancelText: 'Cancel',
    });
  };

  const handleClose = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (alert.onConfirm) {
      alert.onConfirm();
    }
    handleClose();
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'warning':
        return <i className="bi bi-exclamation-triangle-fill text-warning display-5 mb-3"></i>;
      case 'error':
        return <i className="bi bi-x-circle-fill text-danger display-5 mb-3"></i>;
      case 'success':
        return <i className="bi bi-check-circle-fill text-success display-5 mb-3"></i>;
      default:
        return <i className="bi bi-info-circle-fill text-primary display-5 mb-3"></i>;
    }
  };

  return (
    <CustomAlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Custom Modal Backdrop & Dialog */}
      {alert.isOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="modal-body p-4 text-center">
                <div>{getIcon()}</div>
                <h5 className="fw-bold text-dark mb-2">{alert.title}</h5>
                <p className="text-secondary mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {alert.message}
                </p>

                <div className="d-flex align-items-center justify-content-center gap-2">
                  {alert.isConfirm && (
                    <button
                      type="button"
                      className="btn btn-light px-4 py-2 fw-semibold rounded-3 text-secondary border"
                      onClick={handleClose}
                    >
                      {alert.cancelText || 'Cancel'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn ${
                      alert.type === 'error'
                        ? 'btn-danger'
                        : alert.type === 'success'
                        ? 'btn-success'
                        : 'btn-primary'
                    } px-4 py-2 fw-bold rounded-3 shadow-sm`}
                    style={{ backgroundColor: alert.type === 'warning' ? '#0d6efd' : undefined }}
                    onClick={alert.isConfirm ? handleConfirm : handleClose}
                  >
                    {alert.isConfirm ? alert.confirmText : 'OK'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </CustomAlertContext.Provider>
  );
};

export const useCustomAlert = () => {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within a CustomAlertProvider');
  }
  return context;
};
