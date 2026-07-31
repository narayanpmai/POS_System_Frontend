'use client';

import React from 'react';
import { useField } from 'formik';

interface FormikInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  readOnly?: boolean;
  step?: string;
}

export default function FormikInput({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  rows,
  readOnly = false,
  step,
}: FormikInputProps) {
  const [field, meta] = useField(name);
  const hasError = meta.touched && Boolean(meta.error);

  return (
    <div className="mb-3">
      <label htmlFor={name} className="form-label fw-semibold text-secondary">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          {...field}
          id={name}
          rows={rows || 3}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`form-control ${hasError ? 'is-invalid' : ''}`}
        />
      ) : (
        <input
          {...field}
          id={name}
          type={type}
          step={step}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`form-control ${hasError ? 'is-invalid' : ''}`}
        />
      )}

      {hasError && <div className="invalid-feedback d-block fw-semibold">{meta.error}</div>}
    </div>
  );
}
