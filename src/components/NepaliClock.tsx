'use client';

import React, { useState, useEffect } from 'react';
import { formatAdToBsClock } from '@/utils/nepaliDate';

export default function NepaliClock() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());

    const intervalId = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  if (!currentDate) {
    return (
      <div 
        className="d-flex align-items-center gap-2 text-secondary px-3 bg-light rounded-pill border"
        style={{ whiteSpace: 'nowrap', height: '38px', fontSize: '0.82rem' }}
      >
        <i className="bi bi-clock-history"></i>
        <span>Loading...</span>
      </div>
    );
  }

  const formattedBs = formatAdToBsClock(currentDate);

  return (
    <div 
      className="d-flex align-items-center gap-2 text-dark px-3 bg-white rounded-pill border shadow-sm"
      style={{ whiteSpace: 'nowrap', height: '38px', fontSize: '0.82rem', lineHeight: '1.2' }}
    >
      <i className="bi bi-calendar-event text-danger fs-6"></i>
      <span className="fw-semibold text-nowrap" style={{ whiteSpace: 'nowrap' }}>{formattedBs}</span>
    </div>
  );
}
