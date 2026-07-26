'use client';
import React, { useEffect, useState } from 'react';
import Calendar from '@sbmdkl/nepali-datepicker-reactjs';
import '@sbmdkl/nepali-datepicker-reactjs/dist/index.css';
import { useLanguage } from '@/context/LanguageContext';
import { adToBsDate, bsToAdDate, fromDevanagari } from '@/utils/nepaliDate';

interface Props {
  value?: string; // AD Date string e.g., "YYYY-MM-DD" or ISO string
  onChange: (adDateStr: string) => void;
  className?: string;
  placeholder?: string;
}

export default function BSDatePicker({ value, onChange, className, placeholder }: Props) {
  const { language } = useLanguage();
  const [bsDefault, setBsDefault] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (value) {
      try {
        const cleanVal = String(value).split('T')[0];
        const parts = cleanVal.split('-');
        if (parts.length === 3) {
          const yearNum = parseInt(fromDevanagari(parts[0]), 10);
          const monthNum = parseInt(fromDevanagari(parts[1]), 10);
          const dayNum = parseInt(fromDevanagari(parts[2]), 10);

          if (!isNaN(yearNum) && !isNaN(monthNum) && !isNaN(dayNum)) {
            let bsYear: number, bsMonth: number, bsDay: number;

            if (yearNum >= 1900 && yearNum < 2070) {
              // It's a Gregorian (AD) date -> convert AD to BS
              const bsDate = adToBsDate(cleanVal);
              if (bsDate) {
                bsYear = bsDate.year;
                bsMonth = bsDate.month;
                bsDay = bsDate.date;
              } else {
                bsYear = yearNum;
                bsMonth = monthNum;
                bsDay = dayNum;
              }
            } else {
              // It's already a BS date (>= 2070 BS)
              bsYear = yearNum;
              bsMonth = monthNum;
              bsDay = dayNum;
            }

            const formattedBsDefault = `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
            setBsDefault(formattedBsDefault);
          }
        }
      } catch (e) {
        console.error("BSDatePicker value conversion error:", e);
      }
    } else {
      setBsDefault(undefined);
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

      // Convert Devanagari numerals to English digits (e.g., '२०८४-०३-३२' -> '2084-03-32')
      const engBsDateStr = fromDevanagari(bsDateStr);
      const parts = engBsDateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      // Convert BS date accurately to AD ISO date string YYYY-MM-DD
      const isoAdDateStr = bsToAdDate(y, m, d);
      onChange(isoAdDateStr);
    } catch (e) {
      console.error("BSDatePicker handleDateChange error:", e);
      onChange(new Date().toISOString().split('T')[0]);
    }
  };

  if (!ready) return null;

  const defaultPlaceholder = language === 'ne' ? 'मिति छान्नुहोस्' : 'Select Date';

  return (
    <Calendar 
      key={bsDefault || 'empty'}
      className={className || "form-control"} 
      onChange={handleDateChange} 
      theme="default"
      placeholder={placeholder || defaultPlaceholder}
      defaultDate={bsDefault}
      hideDefaultValue={!value}
      language={language === 'ne' ? 'NE' : 'EN'}
    />
  );
}


