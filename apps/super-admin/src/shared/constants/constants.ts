/**
 * Global Constants for Shribi Edufy School Management System
 */

import {
  ACADEMIC_MONTH_SEQUENCE,
  ACADEMIC_MONTH_SEQUENCE_NAMES,
  getCalendarMonthName,
  getCalendarMonthShortName,
  getDefaultAcademicYearForDate,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';

// ==================== ACADEMIC YEAR ====================

/**
 * Get the current academic year (April to March)
 * @returns Academic year in format "YYYY-YYYY" (e.g., "2025-2026")
 * @deprecated Use settings.academic_year from useSettings() hook instead
 */
export function getCurrentAcademicYear(): string {
  const parsed = getDefaultAcademicYearForDate();
  return `${parsed.startYear}-${parsed.endYear}`;
}

/**
 * Get academic year start and end years
 */
export function getAcademicYearParts(): { startYear: number; endYear: number; academicYear: string } {
  const parsed = getDefaultAcademicYearForDate();
  return {
    startYear: parsed.startYear,
    endYear: parsed.endYear,
    academicYear: `${parsed.startYear}-${parsed.endYear}`,
  };
}

// ==================== ACADEMIC MONTHS ====================

/**
 * Calendar months (1–12) in academic session order (April → March).
 */
export const ACADEMIC_MONTHS = ACADEMIC_MONTH_SEQUENCE;

/**
 * Month names in academic session order (April → March).
 */
export const ACADEMIC_MONTH_NAMES = ACADEMIC_MONTH_SEQUENCE_NAMES;

/**
 * Get month name from calendar month number (January = 1 … December = 12).
 */
export function getMonthName(month: number): string {
  return getCalendarMonthName(month);
}

/**
 * Get short month name from calendar month number (January = 1 … December = 12).
 */
export function getShortMonthName(month: number): string {
  return getCalendarMonthShortName(month);
}

export { parseAcademicYear };

// ==================== FEE DEFAULTS ====================

/**
 * Default fee amounts by class (in INR)
 * Used as fallback when fee structures are not available
 */
export const DEFAULT_CLASS_FEES: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
};

/**
 * Default transport fee (in INR)
 */
export const DEFAULT_TRANSPORT_FEE = 0;

/**
 * Default late fee percentage
 */
export const DEFAULT_LATE_FEE_PERCENTAGE = 0;

/**
 * Default late fee grace period (in days)
 */
export const DEFAULT_LATE_FEE_GRACE_DAYS = 7;

// ==================== FEE STATUS ====================

/**
 * Fee status types
 */
export const FEE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  EXEMPTED: 'exempted',
  ADVANCE: 'advance',
} as const;

export type FeeStatus = typeof FEE_STATUS[keyof typeof FEE_STATUS];

/**
 * Fee status colors for UI
 */
export const FEE_STATUS_COLORS = {
  pending: 'orange',
  paid: 'green',
  partial: 'yellow',
  overdue: 'red',
  exempted: 'purple',
  advance: 'blue',
} as const;

// ==================== PAYMENT METHODS ====================

/**
 * Available payment methods
 */
export const PAYMENT_METHODS = {
  CASH: 'cash',
  ONLINE: 'online',
  CHEQUE: 'cheque',
  CARD: 'card',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

/**
 * Payment method display names
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  online: 'Online Payment',
  cheque: 'Cheque',
  card: 'Debit/Credit Card',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
};

// ==================== FEE TYPES ====================

/**
 * Common fee types
 */
export const FEE_TYPES = {
  TUITION: 'tuition',
  TRANSPORT: 'transport',
  LIBRARY: 'library',
  SPORTS: 'sports',
  ACTIVITY: 'activity',
  EXAMINATION: 'examination',
  COMPUTER: 'computer',
  LABORATORY: 'laboratory',
  OTHER: 'other',
} as const;

export type FeeType = typeof FEE_TYPES[keyof typeof FEE_TYPES];

/**
 * Fee type display names with icons
 */
export const FEE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  tuition: { label: 'Tuition Fee', icon: '📚' },
  transport: { label: 'Transport Fee', icon: '🚌' },
  library: { label: 'Library Fee', icon: '📖' },
  sports: { label: 'Sports Fee', icon: '⚽' },
  activity: { label: 'Activity Fee', icon: '🎨' },
  examination: { label: 'Examination Fee', icon: '📝' },
  registration: { label: 'Registration Fee', icon: '📋' },
  computer: { label: 'Computer Fee', icon: '💻' },
  laboratory: { label: 'Laboratory Fee', icon: '🔬' },
  other: { label: 'Other Charges', icon: '📋' },
};

// ==================== CLASSES ====================

/**
 * Available classes (1-10)
 */
export const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * Class display names
 */
export const CLASS_NAMES: Record<number, string> = {
  1: 'Class 1',
  2: 'Class 2',
  3: 'Class 3',
  4: 'Class 4',
  5: 'Class 5',
  6: 'Class 6',
  7: 'Class 7',
  8: 'Class 8',
  9: 'Class 9',
  10: 'Class 10',
};

// ==================== PAGINATION ====================

/**
 * Default pagination limits
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  STUDENTS_PER_PAGE: 20,
  FEES_PER_PAGE: 50,
} as const;

// ==================== DATE FORMATS ====================

/**
 * Common date formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'DD MMM YYYY',
  INPUT: 'YYYY-MM-DD',
  FULL: 'DD MMMM YYYY, hh:mm A',
  SHORT: 'DD/MM/YYYY',
} as const;

// ==================== STUDENT STATUS ====================

/**
 * Student status types
 */
export const STUDENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  GRADUATED: 'graduated',
  TRANSFERRED: 'transferred',
  SUSPENDED: 'suspended',
} as const;

export type StudentStatus = typeof STUDENT_STATUS[keyof typeof STUDENT_STATUS];

// ==================== GENDER ====================

/**
 * Gender options
 */
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export type Gender = typeof GENDER[keyof typeof GENDER];

// ==================== ROLES ====================

/**
 * User roles
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  ACCOUNTANT: 'accountant',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ==================== RECEIPT TYPES ====================

/**
 * Receipt types for fee payments
 */
export const RECEIPT_TYPES = {
  ORIGINAL: 'original',
  COMPLETE_SUMMARY: 'complete',
  TUITION_ONLY: 'tuition',
  DUPLICATE: 'duplicate',
} as const;

export type ReceiptType = typeof RECEIPT_TYPES[keyof typeof RECEIPT_TYPES];

// ==================== FEE FREQUENCY ====================

/**
 * Fee collection frequency
 */
export const FEE_FREQUENCY = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  HALF_YEARLY: 'half_yearly',
  YEARLY: 'yearly',
  ONE_TIME: 'one_time',
} as const;

export type FeeFrequency = typeof FEE_FREQUENCY[keyof typeof FEE_FREQUENCY];

// ==================== VALIDATION ====================

/**
 * Validation constants
 */
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 500,
  MAX_REMARKS_LENGTH: 1000,
  PHONE_LENGTH: 10,
  AADHAAR_LENGTH: 12,
} as const;

// ==================== HELPER FUNCTIONS ====================

/**
 * Get fee status color for UI
 */
export function getFeeStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'orange',
    paid: 'green',
    partial: 'yellow',
    overdue: 'red',
    exempted: 'purple',
    advance: 'blue',
  };
  return colors[status] || 'gray';
}

/**
 * Get Tailwind CSS classes for fee status
 */
export function getFeeStatusClasses(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const classes: Record<string, { bg: string; text: string; border: string }> = {
    pending: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
    },
    paid: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
    },
    partial: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
    },
    overdue: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
    },
    exempted: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
    },
    advance: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
    },
  };
  return classes[status] || {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    border: 'border-gray-200',
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

/**
 * Get default tuition fee for a class
 */
export function getDefaultTuitionFee(classId: number): number {
  return DEFAULT_CLASS_FEES[classId] || 0;
}

/**
 * Check if a month is in the current academic year
 */
export function isInCurrentAcademicYear(month: number, year: number): boolean {
  const { startYear, endYear } = getAcademicYearParts();
  
  if (month >= 4 && month <= 12) {
    return year === startYear;
  } else {
    return year === endYear;
  }
}

/**
 * Get academic year for a specific date
 */
export function getAcademicYearForDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}





