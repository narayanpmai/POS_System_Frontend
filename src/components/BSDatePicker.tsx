'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { adToBsDate, bsToAdDate, bsCalendarMap, toDevanagari, fromDevanagari } from '@/utils/nepaliDate';

interface Props {
  value?: string; // AD Date string e.g., "YYYY-MM-DD" or ISO string
  onChange: (adDateStr: string) => void;
  className?: string;
  containerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

const BS_MONTHS_NE = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'
];

const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const WEEKDAYS_NE = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, monthIndex: number): number {
  try {
    const bsMonth = monthIndex + 1;
    const thisMonthAdStr = bsToAdDate(year, bsMonth, 1);
    const nextMonthAdStr = bsMonth === 12
      ? bsToAdDate(year + 1, 1, 1)
      : bsToAdDate(year, bsMonth + 1, 1);
    const d1 = new Date(thisMonthAdStr);
    const d2 = new Date(nextMonthAdStr);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 28 && diffDays <= 32) {
      return diffDays;
    }
  } catch {}
  const yearData = bsCalendarMap[year];
  if (!yearData) return 30;
  return yearData[monthIndex + 1] || 30;
}

function getFirstDayOfMonth(year: number, monthIndex: number): number {
  try {
    const adDateStr = bsToAdDate(year, monthIndex + 1, 1);
    const parts = adDateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      return d.getDay();
    }
  } catch {}
  return 0;
}

export default function BSDatePicker({
  value,
  onChange,
  className,
  containerClassName,
  placeholder,
  disabled,
}: Props) {
  const { language } = useLanguage();
  const isNe = language === 'ne';

  // Get current today in BS
  const todayBS = React.useMemo(() => {
    const now = new Date();
    const bs = adToBsDate(now);
    return bs ? { year: bs.year, month: bs.month - 1, day: bs.date } : { year: 2083, month: 4, day: 5 };
  }, []);

  // Parse current value
  const parsedBS = React.useMemo(() => {
    if (!value) return null;
    try {
      const cleanVal = String(value).split('T')[0];
      const parts = cleanVal.split('-');
      if (parts.length === 3) {
        const y = parseInt(fromDevanagari(parts[0]), 10);
        const m = parseInt(fromDevanagari(parts[1]), 10);
        const d = parseInt(fromDevanagari(parts[2]), 10);

        if (y >= 1900 && y < 2070) {
          // AD date -> convert to BS
          const bs = adToBsDate(cleanVal);
          return bs ? { year: bs.year, month: bs.month - 1, day: bs.date } : null;
        } else if (y >= 2070) {
          return { year: y, month: m - 1, day: d };
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [value]);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsedBS?.year || todayBS.year);
  const [viewMonth, setViewMonth] = useState(parsedBS?.month !== undefined ? parsedBS.month : todayBS.month);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync view when parsedBS changes
  useEffect(() => {
    if (parsedBS) {
      setViewYear(parsedBS.year);
      setViewMonth(parsedBS.month);
    }
  }, [parsedBS]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDayClick = (day: number) => {
    const bsYear = viewYear;
    const bsMonth = viewMonth + 1;
    const bsDay = day;
    const isoAdDate = bsToAdDate(bsYear, bsMonth, bsDay);
    onChange(isoAdDate);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const isSelected = (day: number) =>
    parsedBS?.year === viewYear && parsedBS?.month === viewMonth && parsedBS?.day === day;

  const isToday = (day: number) =>
    todayBS.year === viewYear && todayBS.month === viewMonth && todayBS.day === day;

  const displayInputValue = parsedBS
    ? `${parsedBS.year}-${String(parsedBS.month + 1).padStart(2, '0')}-${String(parsedBS.day).padStart(2, '0')}`
    : '';

  const monthsList = isNe ? BS_MONTHS_NE : BS_MONTHS_EN;
  const weekdaysList = isNe ? WEEKDAYS_NE : WEEKDAYS_EN;

  return (
    <div ref={containerRef} className={`position-relative w-100 ${containerClassName || ''}`}>
      <div className="input-group">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={isNe && displayInputValue ? toDevanagari(displayInputValue) : displayInputValue}
          onClick={() => {
            if (!disabled) setOpen(!open);
          }}
          placeholder={placeholder || (isNe ? 'मिति छान्नुहोस्' : 'Select Date')}
          className={`form-control ${className || ''}`}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          disabled={disabled}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(!open);
          }}
          className="btn btn-outline-secondary border bg-white"
          style={{ zIndex: 0 }}
        >
          <i className="bi bi-calendar3"></i>
        </button>
      </div>

      {open && (
        <div
          className="position-absolute shadow-lg border rounded bg-white p-3"
          style={{
            top: '100%',
            left: 0,
            zIndex: 9999,
            width: '290px',
            marginTop: '4px',
          }}
        >
          {/* Header Controls */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="btn btn-sm btn-light border py-0 px-2 fw-bold"
            >
              ‹
            </button>
            <div className="d-flex gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="form-select form-select-sm fw-bold border py-1"
                style={{ fontSize: '0.8rem', width: 'auto' }}
              >
                {monthsList.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="form-select form-select-sm fw-bold border py-1"
                style={{ fontSize: '0.8rem', width: 'auto' }}
              >
                {Array.from({ length: 31 }, (_, i) => 2070 + i).map((y) => (
                  <option key={y} value={y}>
                    {isNe ? toDevanagari(y) : y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="btn btn-sm btn-light border py-0 px-2 fw-bold"
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div className="d-grid mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekdaysList.map((d, idx) => (
              <div
                key={d}
                className={`text-center fw-bold py-1 ${idx === 6 ? 'text-danger' : 'text-secondary'}`}
                style={{ fontSize: '0.75rem' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`btn btn-sm p-0 rounded-circle d-flex align-items-center justify-content-center mx-auto ${
                    selected
                      ? 'btn-primary text-white fw-bold shadow-sm'
                      : today
                      ? 'btn-outline-primary fw-bold'
                      : 'btn-light text-dark hover-bg-primary-subtle'
                  }`}
                  style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}
                >
                  {isNe ? toDevanagari(day) : day}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <div className="text-center mt-2 pt-2 border-top">
            <button
              type="button"
              onClick={() => {
                setViewYear(todayBS.year);
                setViewMonth(todayBS.month);
                handleDayClick(todayBS.day);
              }}
              className="btn btn-link btn-sm p-0 fw-bold text-primary"
              style={{ fontSize: '0.75rem', textDecoration: 'none' }}
            >
              {isNe ? 'आज (Today)' : 'Today'} ({isNe ? toDevanagari(`${todayBS.year}-${todayBS.month + 1}-${todayBS.day}`) : `${todayBS.year}-${todayBS.month + 1}-${todayBS.day}`})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
