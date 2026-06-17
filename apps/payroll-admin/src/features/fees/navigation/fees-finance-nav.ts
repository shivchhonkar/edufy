import type { IconType } from 'react-icons';
import {
  FiBarChart2,
  FiBook,
  FiCreditCard,
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
}

export interface FeesSubNavGroup {
  id: string;
  label: string;
  prefix: string;
  items: FeesNavItem[];
}

export const FEES_MAIN_NAV: FeesNavItem[] = [
  { name: 'Dashboard', path: '/fees/dashboard', icon: FiGrid, matchPrefix: '/fees/dashboard' },
  { name: 'Collect Fee', path: '/fees/collect', icon: FiCreditCard, shortcut: 'C', matchPrefix: '/fees/collect' },
  { name: 'Student Ledger', path: '/fees/ledger', icon: FiUsers, matchPrefix: '/fees/ledger' },
  { name: 'Receipts', path: '/fees/receipts', icon: FiPrinter, matchPrefix: '/fees/receipts' },
  { name: 'Setup', path: '/fees/setup/structures', icon: FiLayers, matchPrefix: '/fees/setup' },
  { name: 'Operations', path: '/fees/operations', icon: FiTool, matchPrefix: '/fees/operations' },
  { name: 'Send Reminders', path: '/fees/reminders', icon: FiSend, matchPrefix: '/fees/reminders' },
  { name: 'Reports', path: '/fees/reports', icon: FiBarChart2, matchPrefix: '/fees/reports' },
  { name: 'Accounting', path: '/accounting', icon: FiBook, matchPrefix: '/accounting' },
];

export const FEES_SETUP_NAV: FeesNavItem[] = [
  { name: 'Fee Structures', path: '/fees/setup/structures', icon: FiLayers },
  { name: 'Fee Categories', path: '/fees/setup/categories', icon: FiList },
];

export const FEES_REPORTS_NAV: FeesNavItem[] = [
  { name: 'Collection', path: '/fees/reports?type=collection', icon: RupeeIcon },
  { name: 'Outstanding', path: '/fees/reports?type=outstanding', icon: FiFileText },
  { name: 'Defaulters', path: '/fees/reports?type=defaulters', icon: FiUsers },
  { name: 'Daily Collection', path: '/fees/reports?type=daily', icon: FiGrid },
  { name: 'Student Statements', path: '/fees/reports?type=statements', icon: FiPrinter },
];

export function isFeesNavActive(pathname: string, item: FeesNavItem): boolean {
  const prefix = item.matchPrefix ?? item.path.split('?')[0];
  if (prefix === '/accounting') return pathname.startsWith('/accounting');
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
