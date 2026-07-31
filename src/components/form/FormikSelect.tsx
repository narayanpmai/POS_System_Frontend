'use client';

import React from 'react';
import { useField } from 'formik';

interface Option {
  label: string;
  value: string | number;
}

interface FormikSelectProps {
  label: string;
  name: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
}

export default function FormikSelect({
  label,
  name,
  options,
  placeholder,
  required = false,
}: FormikSelectProps) {
  const [field, meta] = useField(name);
  const hasError = meta.touched && Boolean(meta.error);

  return (
    <div className="mb-3">
      <label htmlFor={name} className="form-label fw-semibold text-secondary">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      <select
        {...field}
        id={name}
        className={`form-select ${hasError ? 'is-invalid' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasError && <div className="invalid-feedback d-block fw-semibold">{meta.error}</div>}
    </div>
  );
}
