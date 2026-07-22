'use client';

import React, { useState, useEffect } from 'react';
import { formatAdToBsClock } from '@/utils/nepaliDate';

export default function NepaliClock() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    // Initial set
    setCurrentDate(new Date());

    // Update time every second
    const intervalId = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  if (!currentDate) {
    return (
      <div className="d-flex align-items-center gap-2 text-secondary fs-7 px-3 py-1 bg-light rounded-pill border">
        <i className="bi bi-clock-history"></i>
        <span>Loading...</span>
      </div>
    );
  }

  // Get formatted BS date with time
  const formattedBs = formatAdToBsClock(currentDate);

  return (
    <div className="d-flex align-items-center gap-2 text-dark fs-7 px-3 py-1 bg-white rounded-pill border shadow-sm">
      <i className="bi bi-calendar-event text-danger"></i>
      <span className="fw-semibold">{formattedBs}</span>
    </div>
  );
}
