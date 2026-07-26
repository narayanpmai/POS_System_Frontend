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
        if (!isNaN(adDate.getTime())) {
          // Add timezone offset to prevent shifting day backwards when using toISOString
          adDate.setMinutes(adDate.getMinutes() - adDate.getTimezoneOffset());
          const isoDate = adDate.toISOString().split('T')[0];
          const nepDate = new NepaliDate(isoDate).toBs();
          setBsDefault(`${nepDate.year}-${String(nepDate.month).padStart(2, '0')}-${String(nepDate.date).padStart(2, '0')}`);
        }
      } catch (e) {
        console.error("Date conversion error", e);
      }
    }
    setReady(true);
  }, [value]);

  const handleDateChange = (arg: any) => {
    try {
      let bsDateStr = "";
      let adDateStr = "";
      
      if (arg && arg.bsDate) {
        bsDateStr = arg.bsDate;
        adDateStr = arg.adDate;
      } else if (typeof arg === 'string') {
        bsDateStr = arg;
      }

      if (!bsDateStr) {
         if (adDateStr) {
             const d = new Date(adDateStr);
             d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
             onChange(d.toISOString().split('T')[0]);
             return;
         }
         onChange(new Date().toISOString().split('T')[0]);
         return;
      }

      // Parse safely using NepaliDate library to avoid mismatched calendar adDates
      const adObj = new NepaliDate(bsDateStr).toAd();
      const adDate = new Date(adObj.year, adObj.month - 1, adObj.date);
      adDate.setMinutes(adDate.getMinutes() - adDate.getTimezoneOffset());
      
      let iso = adDate.toISOString().split('T')[0];
      let backToBs = new NepaliDate(iso).toBs();
      const expectedMonth = parseInt(bsDateStr.split('-')[1]);

      // If date overflowed (e.g., 2084-03-32 capped to 31), step back to remain in correct month
      while (backToBs.month !== expectedMonth && adDate.getTime() > 0) {
         adDate.setDate(adDate.getDate() - 1);
         iso = adDate.toISOString().split('T')[0];
         backToBs = new NepaliDate(iso).toBs();
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
