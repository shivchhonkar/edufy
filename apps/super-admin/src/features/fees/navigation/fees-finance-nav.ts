import type { IconType } from 'react-icons';
import {
  FiArchive,
  FiBarChart2,
  FiBook,
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiFilePlus,
  FiFileText,
  FiGrid,
  FiLayers,
  FiList,
  FiPrinter,
  FiSend,
  FiSettings,
  FiTool,
  FiUsers,
} from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';

export interface FeesNavItem {
  name: string;
  path: string;
  icon: IconType;
  /** Keyboard shortcut hint shown in UI */
  shortcut?: string;
  matchPrefix?: string;
  /** When true, only the exact path matches (not child routes) */
  exact?: boolean;
}

export interface FeesSubNavGroup {
  id: string;
  label: string;
  prefix: string;
  items: FeesNavItem[];
}

export const FEES_MAIN_NAV: FeesNavItem[] = [
  { name: 'Dashboard', path: '/fees/dashboard', icon: FiGrid, matchPrefix: '/fees/dashboard' },
  { name: 'Fee Setup', path: '/fees/setup', icon: FiSettings, matchPrefix: '/fees/setup', exact: true },
  { name: 'Collect Fee', path: '/fees/collect', icon: FiCreditCard, shortcut: 'C', matchPrefix: '/fees/collect' },
  { name: 'Misc Fees Receipt', path: '/fees/misc-receipt', icon: FiFilePlus, matchPrefix: '/fees/misc-receipt' },
  { name: 'Import from Excel', path: '/fees/import', icon: FiFileText, matchPrefix: '/fees/import' },
  { name: 'Student Ledger', path: '/fees/ledger', icon: FiUsers, matchPrefix: '/fees/ledger' },
  { name: 'Receipts', path: '/fees/receipts', icon: FiPrinter, matchPrefix: '/fees/receipts' },
  { name: 'Fee Register', path: '/fees/register', icon: FiList, matchPrefix: '/fees/register' },
  { name: 'Fee Outstanding', path: '/fees/outstanding', icon: FiFileText, matchPrefix: '/fees/outstanding' },
  { name: 'Opening Outstandings', path: '/fees/opening-outstanding', icon: FiArchive, matchPrefix: '/fees/opening-outstanding' },
  { name: 'Fee Structures', path: '/fees/setup/structures', icon: FiLayers, matchPrefix: '/fees/setup/structures' },
  { name: 'Operations', path: '/fees/operations', icon: FiTool, matchPrefix: '/fees/operations' },
  { name: 'Send Reminders', path: '/fees/reminders', icon: FiSend, matchPrefix: '/fees/reminders' },
  { name: 'Reminder Report', path: '/fees/reminders/report', icon: FiClock, matchPrefix: '/fees/reminders/report' },
  { name: 'Refund Voucher', path: '/fees/refunds', icon: RupeeIcon, matchPrefix: '/fees/refunds' },
  { name: 'Fee Reversal', path: '/fees/reversals', icon: FiEdit2, matchPrefix: '/fees/reversals' },
  { name: 'Pending Mobile Receipts', path: '/fees/pending-mobile', icon: FiCreditCard, matchPrefix: '/fees/pending-mobile' },
  { name: 'Reports', path: '/fees/reports', icon: FiBarChart2, matchPrefix: '/fees/reports' },
  { name: 'Accounting', path: '/accounting', icon: FiBook, matchPrefix: '/accounting' },
];

export const FEES_SETUP_NAV: FeesNavItem[] = [
  { name: 'Per Class Setup', path: '/fees/setup', icon: FiSettings, exact: true },
  { name: 'Receipt Series', path: '/fees/setup/series', icon: FiList },
  { name: 'Fee Heads', path: '/fees/setup/categories', icon: FiList },
  { name: 'Category-wise Fees', path: '/fees/setup/category-wise', icon: FiUsers },
  { name: 'Student-wise Fees', path: '/fees/setup/student-wise', icon: FiUsers },
  { name: 'Fee Structures', path: '/fees/setup/structures', icon: FiLayers },
];

export const FEES_REPORTS_NAV: FeesNavItem[] = [
  { name: 'Collection', path: '/fees/reports?type=collection', icon: RupeeIcon },
  { name: 'Outstanding', path: '/fees/reports?type=outstanding', icon: FiFileText },
  { name: 'Defaulters', path: '/fees/reports?type=defaulters', icon: FiUsers },
  { name: 'Daily Collection', path: '/fees/reports?type=daily', icon: FiGrid },
  { name: 'Fee Summary', path: '/fees/reports?type=summary', icon: FiBarChart2 },
  { name: 'Student Statements', path: '/fees/reports?type=statements', icon: FiPrinter },
];

export function isFeesNavActive(pathname: string, item: FeesNavItem): boolean {
  const prefix = item.matchPrefix ?? item.path.split('?')[0];
  if (prefix === '/accounting') return pathname.startsWith('/accounting');
  if (item.exact) return pathname === prefix;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
