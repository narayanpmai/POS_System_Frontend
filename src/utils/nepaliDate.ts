import DateConverter from '@remotemerge/nepali-date-converter';

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
 * Converts a Gregorian (AD) Date string or Date object into a BS date string (e.g. "2083/02/13")
 */
export function formatAdToBs(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    
    // Format to YYYY-MM-DD for the converter using Nepal timezone explicitly
    const formattedAd = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(date);
    
    const converter = new DateConverter(formattedAd);
    const bsDate = converter.toBs(); // returns { year: 2083, month: 2, day: 13 }
    
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
 * Converts a Gregorian (AD) Date string or Date object into a BS date string with Nepali month name (e.g. "Jestha 13, 2083")
 */
export function formatAdToBsFull(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    
    const formattedAd = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(date);
    
    const converter = new DateConverter(formattedAd);
    const bsDate = converter.toBs();
    
    const monthName = nepaliMonths[bsDate.month - 1] || '';
    const nepaliDayName = nepaliDays[bsDate.day as keyof typeof nepaliDays] || bsDate.day;
    
    // Add time if it's a full date string and user wants it (we can just append time)
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
 * Converts a Gregorian (AD) Date string or Date object into a BS date string with short Nepali month name (e.g. "Jestha 13")
 */
export function formatAdToBsShort(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    
    const formattedAd = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(date);
    
    const converter = new DateConverter(formattedAd);
    const bsDate = converter.toBs();
    
    const monthName = nepaliMonths[bsDate.month - 1] || '';
    return toDevanagari(`${monthName} ${bsDate.date}`);
  } catch (err) {
    console.error('Error converting date to BS Short:', err);
    return '';
  }
}

/**
 * Converts a Gregorian (AD) Date object into the requested Nepali Clock Format:
 * "मिति: २०८३ साउन ७ गते, बुधबार (२२ जुलाई २०२६) समय: बिहानको १०:०५ बजे"
 */
export function formatAdToBsClock(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const formattedAd = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(date);

    const converter = new DateConverter(formattedAd);
    const bsDate = converter.toBs();

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

