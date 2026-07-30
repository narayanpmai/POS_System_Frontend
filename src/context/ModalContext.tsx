'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'success' | 'danger' | 'warning' | 'info';

interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (message: string, options?: Omit<ModalOptions, 'message'>) => void;
  showConfirm: (options: ModalOptions) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [modalData, setModalData] = useState<ModalOptions>({ message: '' });
  const [loading, setLoading] = useState(false);

  const showAlert = (message: string, options?: Omit<ModalOptions, 'message'>) => {
    setModalData({
      title: options?.title || 'Notification',
      message,
      type: options?.type || 'info',
      confirmText: options?.confirmText || 'OK',
    });
    setIsConfirm(false);
    setIsOpen(true);
  };

  const showConfirm = (options: ModalOptions) => {
    setModalData({
      title: options.title || 'Confirm Action',
      message: options.message,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
    setIsConfirm(true);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (modalData.onCancel) modalData.onCancel();
    setIsOpen(false);
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (modalData.onConfirm) {
      setLoading(true);
      try {
        await modalData.onConfirm();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(false);
  };

  const getIcon = () => {
    switch (modalData.type) {
      case 'success':
        return (
          <div className="rounded-circle bg-success-subtle p-3 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
            <i className="bi bi-check-circle-fill text-success fs-1"></i>
          </div>
        );
      case 'danger':
        return (
          <div className="rounded-circle bg-danger-subtle p-3 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
            <i className="bi bi-exclamation-octagon-fill text-danger fs-1"></i>
          </div>
        );
      case 'warning':
        return (
          <div className="rounded-circle bg-warning-subtle p-3 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
            <i className="bi bi-exclamation-triangle-fill text-warning fs-1"></i>
          </div>
        );
      default:
        return (
          <div className="rounded-circle bg-primary-subtle p-3 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
            <i className="bi bi-info-circle-fill text-primary fs-1"></i>
          </div>
        );
    }
  };

  const getButtonClass = () => {
    switch (modalData.type) {
      case 'success':
        return 'btn-success text-white';
      case 'danger':
        return 'btn-danger text-white';
      case 'warning':
        return 'btn-warning text-dark';
      default:
        return 'btn-primary text-white';
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}

      {isOpen && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                backgroundColor: 'var(--card-bg, #ffffff)',
                color: 'var(--text-color, #1e293b)',
              }}
            >
              <div className="modal-body text-center p-4">
                <div className="d-flex justify-content-center">{getIcon()}</div>
                {modalData.title && (
                  <h4 className="fw-bold mb-2" style={{ fontSize: '1.25rem' }}>{modalData.title}</h4>
                )}
                <p className="text-secondary mb-4 fs-6" style={{ lineHeight: '1.5', opacity: 0.9 }}>
                  {modalData.message}
                </p>

                <div className="d-flex justify-content-center gap-3">
                  {isConfirm && (
                    <button
                      type="button"
                      className="btn btn-light border px-4 py-2 fw-semibold rounded-pill me-2"
                      onClick={closeModal}
                      disabled={loading}
                    >
                      {modalData.cancelText || 'Cancel'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn ${getButtonClass()} px-4 py-2 fw-bold rounded-pill shadow-sm`}
                    onClick={handleConfirm}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : null}
                    {modalData.confirmText || 'OK'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
