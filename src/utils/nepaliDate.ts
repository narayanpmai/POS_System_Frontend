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
    
    // Add time if it's a full date string and user wants it (we can just append time)
    const hours = String(date.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    const timeStr = toDevanagariDigits(`${hours}:${minutes}`) + ` ${ampm}`;
    
    return `${monthName} ${toDevanagariDigits(bsDate.date)}, ${toDevanagariDigits(bsDate.year)} - ${nepaliDayName} ${timeStr}`;
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
