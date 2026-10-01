export const normalizeBatch = (value: unknown): string => /^20\d{2}$/.test(String(value)) ? String(value) : value === 'Batch 2' ? '2028' : '2027';
