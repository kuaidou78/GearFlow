export function serialize(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serialize(item));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}
