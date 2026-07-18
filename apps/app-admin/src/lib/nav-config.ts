import type { IconType } from 'react-icons';
import {
  FiBarChart2,
  FiBell,
  FiCreditCard,
  FiHome,
  FiLayers,
  FiLifeBuoy,
  FiSearch,
  FiSettings,
  FiUsers,
} from 'react-icons/fi';

export type NavItem = {
  name: string;
  path: string;
  icon: IconType;
};

export const APP_ADMIN_NAV: NavItem[] = [
  { name: 'Dashboard', icon: FiHome, path: '/' },
  { name: 'Organizations', icon: FiLayers, path: '/organizations' },
  { name: 'Subscriptions', icon: FiCreditCard, path: '/subscriptions' },
  { name: 'Users', icon: FiUsers, path: '/organizations' },
  { name: 'School Audit', icon: FiSearch, path: '/school-audit' },
  { name: 'Billing & Payments', icon: FiCreditCard, path: '/subscriptions' },
  { name: 'Support Tickets', icon: FiLifeBuoy, path: '/school-audit' },
  { name: 'Reports', icon: FiBarChart2, path: '/' },
  { name: 'Notifications', icon: FiBell, path: '/' },
  { name: 'System Settings', icon: FiSettings, path: '/organizations' },
];
