import DateConverter from '@remotemerge/nepali-date-converter';

const nepaliMonths = [
  'बैशाख',
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

const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toDevanagariDigits(numStr: string | number): string {
  return String(numStr).replace(/[0-9]/g, (match) => nepaliDigits[parseInt(match)]);
}

/**
 * Converts a Gregorian (AD) Date string or Date object into a BS date string (e.g. "२०८३/०२/१३")
 */
export function formatAdToBs(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    
    // Format to YYYY-MM-DD for the converter
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formattedAd = `${yyyy}-${mm}-${dd}`;
    
    const converter = new DateConverter(formattedAd);
    const bsDate = converter.toBs(); // returns { year: 2083, month: 2, day: 13 }
    
    const bsYear = bsDate.year;
    const bsMonth = String(bsDate.month).padStart(2, '0');
    const bsDayNum = String(bsDate.date).padStart(2, '0');
    
    return toDevanagariDigits(`${bsYear}/${bsMonth}/${bsDayNum}`);
  } catch (err) {
    console.error('Error converting date to BS:', err);
    return '';
  }
}

const nepaliAdMonths = [
  'जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन',
  'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'
];

/**
 * Converts a Gregorian (AD) Date string or Date object into a BS date string with Nepali month name (e.g. "जेठ १३, २०८३")
 */
export function formatAdToBsFull(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formattedAd = `${yyyy}-${mm}-${dd}`;
    
    const converter = new DateConverter(formattedAd);
    const bsDate = converter.toBs();
    
    const monthName = nepaliMonths[bsDate.month - 1] || '';
    const nepaliDayName = nepaliDays[bsDate.day as keyof typeof nepaliDays] || bsDate.day;
    
    const bsYear = toDevanagariDigits(bsDate.year);
    const bsMonth = monthName;
    const bsDay = toDevanagariDigits(bsDate.date);
    
    const adYear = toDevanagariDigits(date.getFullYear());
    const adMonthName = nepaliAdMonths[date.getMonth()];
    const adDay = toDevanagariDigits(date.getDate());
    
    const hour = date.getHours();
    let timePeriod = '';
    if (hour >= 4 && hour < 12) {
      timePeriod = 'बिहानको';
    } else if (hour >= 12 && hour < 16) {
      timePeriod = 'दिउँसोको';
    } else if (hour >= 16 && hour < 20) {
      timePeriod = 'बेलुकाको';
    } else {
      timePeriod = 'रातिको';
    }
    
    const hours12 = hour % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const formattedTime = toDevanagariDigits(`${hours12}:${minutes}`);
    
    return `मिति: ${bsYear} ${bsMonth} ${bsDay} गते, ${nepaliDayName} (${adDay} ${adMonthName} ${adYear}), समय: ${timePeriod} ${formattedTime} बजे`;
  } catch (err) {
    console.error('Error converting date to BS Full:', err);
    return '';
  }
}

/**
 * Converts a Gregorian (AD) Date string or Date object into a BS date string with short Nepali month name (e.g. "जेठ १३")
 */
export function formatAdToBsShort(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formattedAd = `${yyyy}-${mm}-${dd}`;
    
    const converter = new DateConverter(formattedAd);
    const bsDate = converter.toBs();
    
    const monthName = nepaliMonths[bsDate.month - 1] || '';
    return `${monthName} ${toDevanagariDigits(bsDate.date)}`;
  } catch (err) {
    console.error('Error converting date to BS Short:', err);
    return '';
  }
}
