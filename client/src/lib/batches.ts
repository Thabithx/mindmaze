export const normalizeBatch = (value: unknown): string => ['2028', 'Batch 2'].includes(String(value)) ? '2028' : '2027';
