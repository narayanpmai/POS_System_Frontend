import NepaliDate from '@remotemerge/nepali-date-converter';
const adDate = new Date('2027-07-17');
adDate.setMinutes(adDate.getMinutes() - adDate.getTimezoneOffset());
const isoDate = adDate.toISOString().split('T')[0];
const nepDate = new NepaliDate(isoDate).toBs();
console.log('isoDate:', isoDate);
console.log('BS from isoDate:', nepDate);
