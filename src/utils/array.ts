export function toSafeArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.items)) return val.items;
  if (Array.isArray(val.data)) return val.data;
  return [];
}
