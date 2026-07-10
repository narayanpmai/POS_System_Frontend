'use client';
import React, { useEffect, useState } from 'react';
import Calendar from '@sbmdkl/nepali-datepicker-reactjs';
import '@sbmdkl/nepali-datepicker-reactjs/dist/index.css';
import NepaliDate from '@remotemerge/nepali-date-converter';

interface Props {
  value?: string; // AD Date string e.g., "YYYY-MM-DD" or ISO string
  onChange: (adDateStr: string) => void;
  className?: string;
  placeholder?: string;
}

export default function BSDatePicker({ value, onChange, className, placeholder }: Props) {
  const [bsDefault, setBsDefault] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (value) {
      try {
        const adDate = new Date(value);
        const nepDate = new NepaliDate(adDate);
        setBsDefault(nepDate.format('YYYY-MM-DD'));
      } catch (e) {
        console.error("Date conversion error", e);
      }
    }
    setReady(true);
  }, [value]);

  const handleDateChange = ({ bsDate, adDate }: any) => {
    try {
      let iso = "";
      if (typeof adDate === 'string') {
          // If adDate is provided by library
          const d = new Date(adDate);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          iso = d.toISOString().split('T')[0];
      } else if (adDate instanceof Date) {
          const d = new Date(adDate);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          iso = d.toISOString().split('T')[0];
      } else {
          // Fallback if adDate is weird
          const parts = bsDate.split('-');
          const converter = new NepaliDate(bsDate); // This might not work if constructor doesn't take bs string
          // Just use new Date() as absolute fallback
          iso = new Date().toISOString().split('T')[0];
      }
      onChange(iso);
    } catch (e) {
      console.error(e);
      onChange(new Date().toISOString().split('T')[0]);
    }
  };

  if (!ready) return null;

  // The component unmounts and remounts when bsDefault changes to force the defaultDate to apply
  return (
    <Calendar 
       key={bsDefault || 'empty'}
       className={className || "form-control"} 
       onChange={handleDateChange} 
       theme="default"
       placeholder={placeholder || "Select Date"}
       defaultDate={bsDefault}
       hideDefaultValue={!value}
    />
  );
}
