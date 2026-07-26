const nepaliMonths = [
  'वैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत'
];

const nepaliDays = {
  'Sunday': 'आइतबार',
  'Monday': 'सोमबार',
  'Tuesday': 'मंगलबार',
  'Wednesday': 'बुधबार',
  'Thursday': 'बिहीबार',
  'Friday': 'शुक्रबार',
  'Saturday': 'शनिबार'
};

/**
 * Official Government of Nepal BS Calendar matrix for 2000 BS - 2099 BS.
 */
export const bsCalendarMap: Record<number, number[]> = {
  2000: [2000, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [2001, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [2002, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [2003, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [2004, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [2005, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [2006, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [2007, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [2008, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [2009, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [2010, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [2011, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [2012, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [2013, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [2014, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [2015, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [2016, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [2017, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [2018, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [2019, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [2020, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [2021, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [2022, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [2023, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [2024, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [2025, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [2026, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [2027, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [2028, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [2029, 31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [2030, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [2031, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [2032, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [2033, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [2034, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [2035, 30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [2036, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [2037, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [2038, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [2039, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [2040, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [2041, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [2042, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [2043, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [2044, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [2045, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [2046, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [2047, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [2048, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [2049, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [2050, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [2051, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [2052, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [2053, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [2054, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [2055, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [2056, 31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [2057, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [2058, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [2059, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [2060, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [2061, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [2062, 30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [2063, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [2064, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [2065, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [2066, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [2067, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [2068, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [2069, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [2070, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [2071, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [2072, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [2073, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [2074, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [2075, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [2076, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [2077, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [2078, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [2079, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [2080, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [2081, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [2082, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [2083, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [2084, 31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [2085, 31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [2086, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [2087, 31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [2088, 30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [2089, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [2090, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [2091, 31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2092: [2092, 30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2093: [2093, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [2094, 31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [2095, 31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  2096: [2096, 30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2097: [2097, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2098: [2098, 31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31],
  2099: [2099, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
};

const adMonthDays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Converts a Gregorian (AD) Date object or string into accurate Nepali BS Date
 */
export function adToBsDate(dateInput: Date | string | undefined | null) {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  // Extract UTC components to avoid timezone offset shifts
  const todayYear = date.getUTCFullYear();
  const todayMonth = date.getUTCMonth() + 1;
  const todayDay = date.getUTCDate();

  let daysDifference = 0;
  let y = 1943, m = 4, d = 14;
  const startMonthDays = (m === 2 && isLeapYear(y)) ? 29 : adMonthDays[m];
  daysDifference += startMonthDays - d;
  m++;
  while (m <= 12) {
    daysDifference += (m === 2 && isLeapYear(y)) ? 29 : adMonthDays[m];
    m++;
  }
  y++;
  while (y < todayYear) {
    daysDifference += isLeapYear(y) ? 366 : 365;
    y++;
  }
  for (let i = 1; i < todayMonth; i++) {
    daysDifference += (i === 2 && isLeapYear(todayYear)) ? 29 : adMonthDays[i];
  }
  daysDifference += todayDay;

  let currentYear = 0, currentMonth = 0, currentDay = 0, totalD = 0, flag = false;
  for (let i = 2000; i < 2100; i++) {
    if (flag) break;
    const yearData = bsCalendarMap[i];
    if (!yearData) continue;
    for (let j = 1; j <= 12; j++) {
      totalD += yearData[j];
      if (daysDifference - totalD < 0) {
        currentDay = daysDifference - totalD + yearData[j] + 1;
        flag = true;
        currentYear = i;
        currentMonth = j;
        break;
      }
    }
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[date.getUTCDay()];

  return {
    year: currentYear,
    month: currentMonth,
    date: currentDay,
    day: dayName
  };
}

/**
 * Converts a Nepali BS date (year, month, day) into ISO AD date string YYYY-MM-DD
 */
export function bsToAdDate(year: number, month: number, day: number): string {
  let daysDiff = 0;
  for (let i = 2000; i <= year; i++) {
    const yearData = bsCalendarMap[i];
    if (!yearData) continue;
    if (i === year) {
      for (let j = 1; j < month; j++) {
        daysDiff += yearData[j];
      }
      daysDiff += day - 1;
    } else {
      for (let j = 1; j <= 12; j++) {
        daysDiff += yearData[j];
      }
    }
  }
  const baseDate = new Date(Date.UTC(1943, 3, 14)); // 1943-04-14 UTC
  baseDate.setUTCDate(baseDate.getUTCDate() + daysDiff);
  return baseDate.toISOString().split('T')[0];
}

/**
 * Converts English numerals (0-9) and AM/PM indicators into Devanagari script
 */
export function toDevanagari(str: string | number): string {
  const map: Record<string, string> = {
    '0': '०',
    '1': '१',
    '2': '२',
    '3': '३',
    '4': '४',
    '5': '५',
    '6': '६',
    '7': '७',
    '8': '८',
    '9': '९',
    'AM': 'पूर्वाह्न',
    'PM': 'अपराह्न'
  };
  return String(str).replace(/[0-9]|AM|PM/g, (matched) => map[matched] || matched);
}

/**
 * Converts Devanagari numerals (०-९) back to English digits (0-9)
 */
export function fromDevanagari(str: string | number): string {
  const map: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9'
  };
  return String(str).replace(/[०-९]/g, (matched) => map[matched] || matched);
}

/**
 * Converts a Gregorian (AD) Date string or Date object into a BS date string (e.g. "2084/03/32")
 */
export function formatAdToBs(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const bsDate = adToBsDate(dateInput);
    if (!bsDate) return '';
    
    const bsYear = bsDate.year;
    const bsMonth = String(bsDate.month).padStart(2, '0');
    const bsDayNum = String(bsDate.date).padStart(2, '0');
    
    return toDevanagari(`${bsYear}/${bsMonth}/${bsDayNum}`);
  } catch (err) {
    console.error('Error converting date to BS:', err);
    return '';
  }
}

/**
 * Converts a Gregorian (AD) Date string or Date object into a BS date string with Nepali month name (e.g. "2084 असार 32")
 */
export function formatAdToBsFull(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    const bsDate = adToBsDate(dateInput);
    if (!bsDate) return '';
    
    const monthName = nepaliMonths[bsDate.month - 1] || '';
    const nepaliDayName = nepaliDays[bsDate.day as keyof typeof nepaliDays] || bsDate.day;
    
    const hours = String(date.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    const timeStr = `${hours}:${minutes} ${ampm}`;
    
    return toDevanagari(`${bsDate.year} ${monthName} ${bsDate.date} - ${nepaliDayName} ${timeStr}`);
  } catch (err) {
    console.error('Error converting date to BS Full:', err);
    return '';
  }
}

/**
 * Converts a Gregorian (AD) Date string or Date object into a BS date string with short Nepali month name (e.g. "असार 32")
 */
export function formatAdToBsShort(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const bsDate = adToBsDate(dateInput);
    if (!bsDate) return '';
    
    const monthName = nepaliMonths[bsDate.month - 1] || '';
    return toDevanagari(`${monthName} ${bsDate.date}`);
  } catch (err) {
    console.error('Error converting date to BS Short:', err);
    return '';
  }
}

/**
 * Converts a Gregorian (AD) Date object into the requested Nepali Clock Format:
 * "मिति: २०८४ असार ३२ गते, शुक्रबार (१६ जुलाई २०२७) समय: बिहानको १०:०५ बजे"
 */
export function formatAdToBsClock(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    const bsDate = adToBsDate(dateInput);
    if (!bsDate) return '';

    const monthName = nepaliMonths[bsDate.month - 1] || '';
    const nepaliDayName = nepaliDays[bsDate.day as keyof typeof nepaliDays] || bsDate.day;

    const nepaliAdMonths = [
      'जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन',
      'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'
    ];
    const adMonthName = nepaliAdMonths[date.getMonth()];

    const rawHours = date.getHours();
    const displayHours = rawHours % 12 || 12;
    const displayMinutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${displayHours}:${displayMinutes}`;

    let timeDesc = 'रातिको';
    if (rawHours >= 4 && rawHours < 12) {
      timeDesc = 'बिहानको';
    } else if (rawHours >= 12 && rawHours < 16) {
      timeDesc = 'दिउँसोको';
    } else if (rawHours >= 16 && rawHours < 20) {
      timeDesc = 'बेलुकाको';
    }

    const bsYearDev = toDevanagari(bsDate.year);
    const bsDateDev = toDevanagari(bsDate.date);
    const adDayDev = toDevanagari(date.getDate());
    const adYearDev = toDevanagari(date.getFullYear());
    const timeStrDev = toDevanagari(timeStr);

    return `मिति: ${bsYearDev} ${monthName} ${bsDateDev} गते, ${nepaliDayName} (${adDayDev} ${adMonthName} ${adYearDev}) समय: ${timeDesc} ${timeStrDev} बजे`;
  } catch (err) {
    console.error('Error converting date to BS Clock:', err);
    return '';
  }
}
