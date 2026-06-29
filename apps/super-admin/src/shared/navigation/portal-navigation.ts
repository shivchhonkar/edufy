import type { IconType } from 'react-icons';
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiCreditCard,
  FiGrid,
  FiHome,
  FiMap,
  FiTruck,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import type { PortalId } from '@/lib/role-routing';

export interface PortalNavItem {
  name: string;
  path: string;
  icon: IconType;
  comingSoon?: boolean;
}

export const PORTAL_NAV: Record<PortalId, PortalNavItem[]> = {
  admin: [{ name: 'Dashboard', path: '/admin', icon: FiGrid }],
  teacher: [
    { name: 'Dashboard', path: '/teacher', icon: FiHome },
    { name: 'Attendance', path: '/teacher/attendance', icon: FiCalendar },
    { name: 'Homework', path: '/teacher/homework', icon: FiBookOpen },
    { name: 'Leave', path: '/teacher/leaves', icon: FiClipboard },
  ],
  parent: [
    { name: 'Dashboard', path: '/parent', icon: FiHome },
    { name: 'Profile', path: '/parent/profile', icon: FiUser },
    { name: 'Homework', path: '/parent/homework', icon: FiBookOpen },
    { name: 'Fees', path: '/parent/fees', icon: FiCreditCard },
    { name: 'Attendance', path: '/parent/attendance', icon: FiCalendar },
    { name: 'Calendar', path: '/parent/calendar', icon: FiCalendar },
    { name: 'Results', path: '/parent/results', icon: FiClipboard },
    { name: 'Notifications', path: '/parent/notifications', icon: FiBell },
  ],
  transport: [
    { name: 'Dashboard', path: '/transport/dashboard', icon: FiTruck },
    { name: 'Vehicles', path: '/transport/vehicles', icon: FiTruck },
    { name: 'Drivers', path: '/transport/driver-management', icon: FiUser },
    { name: 'Routes', path: '/transport/routes', icon: FiMap },
    { name: 'Students', path: '/transport/students', icon: FiUsers },
    { name: 'Assignments', path: '/transport/current-assignments', icon: FiUsers },
    { name: 'Route Plans', path: '/transport/route-assignments', icon: FiMap },
    { name: 'Reports', path: '/transport/reports', icon: FiClipboard },
  ],
};

export const PORTAL_TITLES: Record<PortalId, string> = {
  admin: 'Admin Portal',
  teacher: 'Teacher Portal',
  parent: 'Parent Portal',
  transport: 'Transport Portal',
};
