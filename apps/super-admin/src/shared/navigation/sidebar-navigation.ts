import type { IconType } from 'react-icons';
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiBook,
  FiAward,
  FiBriefcase,
  FiTruck,
  FiMessageSquare,
  FiSettings,
} from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';

export interface NavLink {
  name: string;
  path: string;
  /** Shown as a subtle badge when the route is not fully built yet */
  comingSoon?: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  // description: string;
  icon: IconType;
  items: NavLink[];
}

export const SIDEBAR_NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    // description: 'Overview, insights, and system activity.',
    icon: FiHome,
    items: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Analytics', path: '/dashboard/analytics' },
      { name: 'Reports', path: '/settings/reports' },
      { name: 'Activity Logs', path: '/dashboard/activity-logs' },
    ],
  },
  {
    id: 'student-management',
    title: 'Student Management',
    // description: 'Manage the complete student lifecycle.',
    icon: FiUsers,
    items: [
      { name: 'Admissions', path: '/admissions' },
      { name: 'Students', path: '/students' },
      { name: 'Promotions', path: '/promotions' },
      { name: 'Transfer Certificates', path: '/students/transfer-certificates' },
      { name: 'Student Documents', path: '/students?hint=documents' },
      { name: 'Student Health Records', path: '/students?hint=medical' },
      { name: 'Student ID Cards', path: '/students/id-cards' },
    ],
  },
  {
    id: 'academics',
    title: 'Academics',
    // description: 'Manage teaching and learning.',
    icon: FiBook,
    items: [
      { name: 'Classes', path: '/classes' },
      { name: 'Sections', path: '/classes?tab=sections' },
      { name: 'Subjects', path: '/subjects' },
      { name: 'Timetable', path: '/timetable' },
      { name: 'Homework', path: '/homework' },
      { name: 'Lesson Plans', path: '/classes?tab=lesson-plans' },
      { name: 'Syllabus Tracking', path: '/teachers/syllabus' },
      { name: 'Teacher Assignments', path: '/hr/teacher-assignments' },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    // description: 'Track student and staff attendance.',
    icon: FiUserCheck,
    items: [
      { name: 'Student Attendance', path: '/attendance/students' },
      { name: 'Staff Attendance', path: '/attendance/staff' },
      { name: 'Attendance Reports', path: '/hr/reports?type=attendance' },
      { name: 'Biometric Integration', path: '/coming-soon?feature=biometric', comingSoon: true },
    ],
  },
  {
    id: 'examination-results',
    title: 'Examination & Results',
    // description: 'Conduct and publish assessments.',
    icon: FiAward,
    items: [
      { name: 'Exams', path: '/exams' },
      { name: 'Marks Entry', path: '/exams' },
      { name: 'Grade Management', path: '/report-cards' },
      { name: 'Report Cards', path: '/report-cards' },
      { name: 'Result Analytics', path: '/coming-soon?feature=result-analytics', comingSoon: true },
      { name: 'Rank Lists', path: '/teachers/ranking' },
    ],
  },
  {
    id: 'fees-finance',
    title: 'Fees & Finance',
    // description: 'Manage collections and accounting.',
    icon: RupeeIcon,
    items: [
      { name: 'Fees', path: '/fees' },
      { name: 'Fee Structures', path: '/fees?tab=structures' },
      { name: 'Fee Collection', path: '/fees?tab=students' },
      { name: 'Accounting', path: '/accounting' },
      { name: 'Receipts', path: '/fees?tab=overview' },
      { name: 'Financial Reports', path: '/accounting' },
    ],
  },
  {
    id: 'staff-hr',
    title: 'Staff & HR',
    // description: 'Manage all employees, not just teachers.',
    icon: FiBriefcase,
    items: [
      { name: 'Teachers', path: '/teachers' },
      { name: 'Staff', path: '/staff' },
      { name: 'Departments', path: '/hr/departments' },
      { name: 'Leave Management', path: '/hr/leaves' },
      { name: 'Payroll', path: '/payroll' },
      { name: 'ESS', path: '/ess' },
      { name: 'Performance Tracking', path: '/teachers/performance' },
      { name: 'Teacher Ranking', path: '/teachers/ranking' },
      { name: 'Daily Activities', path: '/teachers/daily-activities' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    // description: 'Transport, inventory, and school services.',
    icon: FiTruck,
    items: [
      { name: 'Transport', path: '/transport' },
      { name: 'Inventory', path: '/inventory' },
      { name: 'Library', path: '/inventory' },
      { name: 'Hostel', path: '/coming-soon?feature=hostel', comingSoon: true },
      { name: 'Assets', path: '/inventory' },
      { name: 'Maintenance', path: '/settings?tab=maintenance' },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    // description: 'Parent and staff engagement.',
    icon: FiMessageSquare,
    items: [
      { name: 'SMS', path: '/communications?tab=sms' },
      { name: 'WhatsApp', path: '/communications?tab=whatsapp' },
      { name: 'Circulars', path: '/communications?tab=circulars' },
      { name: 'Notifications', path: '/communications?tab=notifications' },
      { name: 'Email Campaigns', path: '/communications?tab=email' },
      { name: 'Message History', path: '/communications?tab=history' },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    // description: 'System-level controls.',
    icon: FiSettings,
    items: [
      { name: 'School Setup', path: '/setup' },
      { name: 'Academic Year', path: '/settings?tab=academic' },
      { name: 'Settings', path: '/settings' },
      { name: 'User Roles', path: '/settings?tab=users' },
      { name: 'Permissions', path: '/coming-soon?feature=permissions', comingSoon: true },
      { name: 'Audit Logs', path: '/coming-soon?feature=audit-logs', comingSoon: true },
      { name: 'Integrations', path: '/coming-soon?feature=integrations', comingSoon: true },
    ],
  },
];

/** Paths where only an exact match counts (not child routes). */
const EXACT_MATCH_PATHS = new Set([
  '/dashboard',
  '/settings',
  '/hr',
  '/teachers',
  '/fees',
  '/classes',
  '/students',
  '/exams',
  '/accounting',
  '/communications',
  '/inventory',
]);

export function isNavLinkActive(pathname: string, linkPath: string): boolean {
  const [path] = linkPath.split('?');

  if (EXACT_MATCH_PATHS.has(path)) {
    return pathname === path;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function findActiveGroupId(pathname: string): string | null {
  for (const group of SIDEBAR_NAV_GROUPS) {
    if (group.items.some((item) => isNavLinkActive(pathname, item.path))) {
      return group.id;
    }
  }
  return null;
}

export function getInitialExpandedGroups(pathname: string): Record<string, boolean> {
  const activeId = findActiveGroupId(pathname);
  const expanded: Record<string, boolean> = {};
  for (const group of SIDEBAR_NAV_GROUPS) {
    expanded[group.id] = group.id === activeId;
  }
  return expanded;
}
