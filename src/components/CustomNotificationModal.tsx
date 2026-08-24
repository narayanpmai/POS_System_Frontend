'use client';

import React from 'react';

export interface NotificationState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onConfirm?: () => void;
}

interface Props {
  notification: NotificationState | null;
  onClose: () => void;
}

export default function CustomNotificationModal({ notification, onClose }: Props) {
  if (!notification || !notification.show) return null;

  const { type, title, message, onConfirm } = notification;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'bi-check-circle-fill',
          color: 'text-success',
          bgColor: 'bg-success-subtle',
          btnClass: 'btn-success',
          defaultTitle: 'सफलता (Success)',
        };
      case 'error':
        return {
          icon: 'bi-x-circle-fill',
          color: 'text-danger',
          bgColor: 'bg-danger-subtle',
          btnClass: 'btn-danger',
          defaultTitle: 'त्रुटि (Error)',
        };
      case 'warning':
        return {
          icon: 'bi-exclamation-triangle-fill',
          color: 'text-warning',
          bgColor: 'bg-warning-subtle',
          btnClass: 'btn-warning text-dark',
          defaultTitle: 'सचेत (Warning)',
        };
      case 'info':
      default:
        return {
          icon: 'bi-info-circle-fill',
          color: 'text-primary',
          bgColor: 'bg-primary-subtle',
          btnClass: 'btn-primary',
          defaultTitle: 'जानकारी (Notice)',
        };
    }
  };

  const styleConfig = getIconAndColor();

  const handleClose = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 99999, backdropFilter: 'blur(3px)' }}
      tabIndex={-1}
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden animate__animated animate__zoomIn animate__faster">
          <div className="modal-body p-4 text-center">
            {/* Top Icon Badge */}
            <div
              className={`d-inline-flex align-items-center justify-content-center rounded-circle mb-3 ${styleConfig.bgColor} ${styleConfig.color}`}
              style={{ width: '64px', height: '64px' }}
            >
              <i className={`bi ${styleConfig.icon} fs-1`}></i>
            </div>

            {/* Title */}
            <h5 className="fw-bold text-dark mb-2">
              {title || styleConfig.defaultTitle}
            </h5>

            {/* Message Body */}
            <p className="text-secondary mb-4 fs-6" style={{ whiteSpace: 'pre-line' }}>
              {message}
            </p>

            {/* Action Button */}
            <button
              type="button"
              className={`btn ${styleConfig.btnClass} rounded-pill px-4 py-2 fw-bold w-100 shadow-sm`}
              onClick={handleClose}
              autoFocus
            >
              <i className="bi bi-check2 me-1"></i> ठीक छ (OK)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
