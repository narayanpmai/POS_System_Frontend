/**
 * Helper to cleanly format stock numbers to maximum 2 decimal places,
 * eliminating JavaScript floating-point artifacts (e.g. 5.0000000001 -> 5, 12.3333333 -> 12.33).
 */
export const formatStock = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '0';
  // Round to max 2 decimal places and strip redundant trailing zeros (e.g. 10.00 -> 10, 10.50 -> 10.5)
  return Number(num.toFixed(2)).toString();
};

/**
 * Format currency value to 2 decimal places string (e.g. 120 -> "120.00")
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};
