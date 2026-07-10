const NepaliDate = require('@remotemerge/nepali-date-converter');

const adDate = new Date('2023-11-20');
const bsDate = new NepaliDate(adDate);
console.log('BS Date:', bsDate.format('YYYY-MM-DD'));

const fromBs = new NepaliDate('2080-08-04');
console.log('From BS to AD object:', fromBs.getAD());
console.log('From BS to JS Date:', new Date(fromBs.getAD().year, fromBs.getAD().month - 1, fromBs.getAD().date).toISOString());
