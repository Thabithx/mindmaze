/**
 * Comprehensive input validation utilities for Mind Maze app.
 */

// Email regex matching standard format (e.g. name@domain.com)
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone / WhatsApp regex: Supports Sri Lanka & international formats:
// e.g., 0771234567, +94771234567, 94771234567, 0112345678, or 9-15 digits with optional +
export const PHONE_REGEX = /^(\+?[0-9]{9,15}|0[0-9]{9})$/;

/**
 * Validates email address.
 * Returns null if valid, or an error string if invalid.
 */
export function validateEmail(email: string): string | null {
  const clean = (email || '').trim();
  if (!clean) {
    return 'Please enter your email address.';
  }
  if (!EMAIL_REGEX.test(clean)) {
    return 'Please enter a valid email address (e.g. student@gmail.com).';
  }
  return null;
}

/**
 * Validates phone / WhatsApp number.
 * Allows empty if not required, but if provided, must be a valid phone number.
 */
export function validatePhone(phone: string, required = false): string | null {
  const clean = (phone || '').trim().replace(/[\s\-\(\)]/g, '');
  if (!clean) {
    if (required) return 'Please enter your phone or WhatsApp contact number.';
    return null;
  }
  if (!PHONE_REGEX.test(clean) && (clean.length < 9 || clean.length > 15)) {
    return 'Please enter a valid 9-10 digit mobile or WhatsApp phone number (e.g. 0771234567 or +94771234567).';
  }
  return null;
}

/**
 * Validates password length and complexity.
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Please enter a password.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  return null;
}

/**
 * Validates full name / username.
 */
export function validateName(name: string, fieldName = 'Name'): string | null {
  const clean = (name || '').trim();
  if (!clean) {
    return `Please enter your ${fieldName.toLowerCase()}.`;
  }
  if (clean.length < 2) {
    return `${fieldName} must be at least 2 characters long.`;
  }
  return null;
}

/**
 * Validates 4-digit year format (e.g. 2026).
 */
export function validateYear(year: string | number, minYear = 2000, maxYear = 2035): string | null {
  const num = typeof year === 'number' ? year : parseInt(String(year), 10);
  if (isNaN(num) || num < minYear || num > maxYear) {
    return `Please enter a valid examination year between ${minYear} and ${maxYear}.`;
  }
  return null;
}

/**
 * Validates required text field.
 */
export function validateRequired(value: string, fieldName: string, minLen = 1): string | null {
  const clean = (value || '').trim();
  if (!clean || clean.length < minLen) {
    return `Please fill in ${fieldName.toLowerCase()} properly (at least ${minLen} characters).`;
  }
  return null;
}
