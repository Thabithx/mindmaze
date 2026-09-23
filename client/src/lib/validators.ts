/**
 * Validation utilities for Mind Maze forms
 */

// RFC 5322 compliant regex for standard email validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates Sri Lankan and international phone / WhatsApp numbers.
 * Allowed formats:
 * - Sri Lanka local: 0712345678, 0771234567, 070..., 071..., 072..., 074..., 075..., 076..., 077..., 078...
 * - Sri Lanka international: +94771234567, 0094771234567, 94771234567
 * - General international format: +[country_code][digits] with 9 to 15 digits total.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 9 || digits.length > 15) return false;

  // Sri Lankan local format (10 digits starting with 07 or 011/0xx)
  if (digits.length === 10 && digits.startsWith('0')) {
    return /^0\d{9}$/.test(digits);
  }

  // Sri Lankan with +94 or 94
  if ((trimmed.startsWith('+94') || trimmed.startsWith('94')) && (digits.length === 11 || digits.length === 12)) {
    return /^(\+?94|0094)\d{9}$/.test(trimmed.replace(/[\s\-()]/g, ''));
  }

  // Standard international phone check
  return /^[+]?[\d\s\-().]{9,20}$/.test(trimmed) && digits.length >= 9 && digits.length <= 15;
}

export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  if (password.length > 100) {
    return { valid: false, message: 'Password is too long (maximum 100 characters).' };
  }
  return { valid: true };
}

export function isValidExamYear(year: string | number): boolean {
  if (!year) return false;
  const num = typeof year === 'number' ? year : parseInt(String(year).trim(), 10);
  return !Number.isNaN(num) && num >= 2020 && num <= 2040;
}

export function isValidZScore(score: string): boolean {
  if (!score || !score.trim()) return true; // optional field
  const num = parseFloat(score.trim());
  return !Number.isNaN(num) && num >= -1.0 && num <= 4.0;
}

export function isValidDateString(date: string): boolean {
  if (!date || typeof date !== 'string') return false;
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const d = new Date(trimmed + 'T00:00:00');
  return !Number.isNaN(d.getTime());
}
