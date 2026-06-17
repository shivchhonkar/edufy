// Utility function for merging class names
export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

// Format date
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

// Generate random string
export function generateRandomString(length: number = 10): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Generate admission number (ADM + year + 6 random digits)
export function generateAdmissionNumber(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const random = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `ADM${currentYear}${random}`;
}

// Generate employee ID
export function generateEmployeeId(prefix: string = 'EMP'): string {
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${random}`;
}

// Calculate age from date of birth
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Indian format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

// Get academic year
export function getCurrentAcademicYear(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  
  // Academic year starts in April (month 4)
  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Get initials from name
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Sleep/delay function
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Pagination helper
export function getPaginationParams(
  page: number = 1,
  limit: number = 10
): { offset: number; limit: number } {
  const offset = (page - 1) * limit;
  return { offset, limit };
}

// Build SQL WHERE clause from search params
export function buildSearchQuery(
  searchTerm: string,
  fields: string[]
): { clause: string; values: any[] } {
  if (!searchTerm) return { clause: '', values: [] };
  
  const conditions = fields.map((field, index) => 
    `${field} ILIKE $${index + 1}`
  );
  
  const clause = `(${conditions.join(' OR ')})`;
  const values = fields.map(() => `%${searchTerm}%`);
  
  return { clause, values };
}

export {
  HTML2PDF_PAGE_MARGIN_MM,
  PRINT_PAGE_MARGIN_MM,
  FR_RECEIPT_CONTENT_STYLES,
  RECEIPT_PRINT_DOCUMENT_STYLES,
  RECEIPT_PREVIEW_STYLES,
} from './print-layout'

export function resolveSchoolAssetUrl(
  assetPath: string | null | undefined,
  requestHost?: string | null,
): string {
  const path = assetPath?.trim();
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const origin = getSuperAdminOrigin(requestHost);
  return origin ? `${origin}${normalized}` : normalized;
}

function getSuperAdminOrigin(requestHost?: string | null): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SUPER_ADMIN_URL?.replace(/\/$/, '');

  if (fromEnv) return fromEnv;

  if (requestHost) {
    const hostname = requestHost.split(':')[0];
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return `http://${hostname}:7000`;
    }
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseHost = requestHost.replace(/:\d+$/, '');
    return `${protocol}://${baseHost}`;
  }

  const baseDomain = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;
  if (baseDomain) {
    const hasProtocol = baseDomain.startsWith('http');
    const hostOnly = baseDomain.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    const protocol = baseDomain.startsWith('https') ? 'https' : 'http';
    return hasProtocol ? baseDomain.replace(/\/$/, '') : `${protocol}://${hostOnly}`;
  }

  return 'http://localhost:7000';
}

