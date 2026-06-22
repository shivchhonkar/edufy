import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiArchive,
  FiArrowUpCircle,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBook,
  FiBookOpen,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiClipboard,
  FiClock,
  FiCpu,
  FiCreditCard,
  FiEdit,
  FiEdit2,
  FiFilePlus,
  FiFileText,
  FiFlag,
  FiFolder,
  FiGrid,
  FiHeart,
  FiHome,
  FiLayers,
  FiLink,
  FiList,
  FiLock,
  FiMail,
  FiMessageCircle,
  FiMessageSquare,
  FiMonitor,
  FiPackage,
  FiPieChart,
  FiPrinter,
  FiSend,
  FiSettings,
  FiShield,
  FiTarget,
  FiTool,
  FiTrendingUp,
  FiTruck,
  FiUser,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import RupeeIcon from '@/shared/components/icons/RupeeIcon';

export interface NavLink {
  name: string;
  path: string;
  icon: IconType;
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
    icon: FiHome,
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: FiGrid },
      { name: 'Analytics', path: '/dashboard/analytics', icon: FiBarChart2 },
      { name: 'Reports', path: '/settings/reports', icon: FiFileText },
      { name: 'Activity Logs', path: '/dashboard/activity-logs', icon: FiActivity },
    ],
  },
  {
    id: 'admissions',
    title: 'Admissions',
    icon: FiUserPlus,
    items: [
      { name: 'Admissions', path: '/admissions', icon: FiUserPlus },
      // { name: 'Students', path: '/students', icon: FiUsers },
      // { name: 'Promotions', path: '/promotions', icon: FiArrowUpCircle },
    ],
  },
  {
    id: 'student-management',
    title: 'Students',
    icon: FiUsers,
    items: [
      // { name: 'Admissions', path: '/admissions', icon: FiUserPlus },
      { name: 'Students', path: '/students', icon: FiUsers },
      { name: 'Promotions', path: '/promotions', icon: FiArrowUpCircle },
      {
        name: 'Transfer Certificate',
        // path: '/students/transfer-certificates/generate',
        path: '/students/transfer-certificates',
        icon: FiFilePlus,
      },
      // {
      //   name: 'Transfer Certificate History',
      //   path: '/students/transfer-certificates',
      //   icon: FiArchive,
      // },
      // { name: 'Student Documents', path: '/students?hint=documents', icon: FiFolder },
      // { name: 'Student Health Records', path: '/students?hint=medical', icon: FiHeart },
      { name: 'Student ID Cards', path: '/students/id-cards', icon: FiCreditCard },
      { name: 'Gate Pass Exit', path: '/students/gate-pass', icon: FiShield },
      { name: 'Visitor Mgmt.', path: '/visitor-management', icon: FiUserCheck },
    ],
  },
  {
    id: 'academics',
    title: 'Academics',
    icon: FiBook,
    items: [
      { name: 'Classes', path: '/academics/classes', icon: FiLayers },
      { name: 'Sections', path: '/academics/classes?tab=sections', icon: FiGrid },
      { name: 'School Houses', path: '/academics/houses', icon: FiFlag },
      { name: 'Subjects', path: '/academics/subjects', icon: FiBookOpen },
      { name: 'Timetable', path: '/academics/timetable', icon: FiCalendar },
      // { name: 'Homework', path: '/academics/homework', icon: FiClipboard },
      // { name: 'Lesson Plans', path: '/academics/classes?tab=lesson-plans', icon: FiList },
      { name: 'Syllabus Tracking', path: '/academics/syllabus', icon: FiCheckSquare },
      { name: 'Teacher Assignments', path: '/academics/teacher-assignments', icon: FiUserCheck },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    icon: FiUserCheck,
    items: [
      { name: 'Student Attendance', path: '/attendance/students', icon: FiCheckCircle },
      { name: 'Attendance Reports', path: '/attendance/reports', icon: FiBarChart2 },
      {
        name: 'Biometric Integration',
        path: '/coming-soon?feature=biometric',
        icon: FiCpu,
        comingSoon: true,
      },
      { name: 'Staff Attendance', path: '/attendance/staff', icon: FiUserCheck },
    ],
  },
  {
    id: 'homework',
    title: 'Homework & Plans',
    icon: FiBookOpen,
    items: [
      { name: 'Homework', path: '/homework', icon: FiBookOpen },
      { name: 'Lesson Plans', path: '/academics/classes?tab=lesson-plans', icon: FiList },
    ],
  },
  
  {
    id: 'examination-results',
    title: 'Examination & Results',
    icon: FiAward,
    items: [
      { name: 'Exams', path: '/exams', icon: FiEdit },
      { name: 'Exam Analytics', path: '/exams/analytics', icon: FiBarChart2 },
      { name: 'Marks Entry', path: '/exams', icon: FiEdit2 },
      { name: 'Grade Management', path: '/report-cards', icon: FiAward },
      { name: 'Report Cards', path: '/report-cards', icon: FiFileText },
      {
        name: 'Result Analytics',
        path: '/coming-soon?feature=result-analytics',
        icon: FiPieChart,
        comingSoon: true,
      },
      { name: 'Rank Lists', path: '/teachers/ranking', icon: FiList },
    ],
  },
  {
    id: 'fees-finance',
    title: 'Fees & Accounts',
    icon: RupeeIcon,
    items: [
      { name: 'Dashboard', path: '/fees/dashboard', icon: FiGrid },
      { name: 'Collect Fee', path: '/fees/collect', icon: FiCreditCard },
      { name: 'Student Ledger', path: '/fees/ledger', icon: FiUsers },
      { name: 'Receipts', path: '/fees/receipts', icon: FiPrinter },
      { name: 'Fee Structures', path: '/fees/setup/structures', icon: FiLayers },
      { name: 'Operations', path: '/fees/operations', icon: FiTool },
      { name: 'Send Reminders', path: '/fees/reminders', icon: FiSend },
      { name: 'Reports', path: '/fees/reports', icon: FiBarChart2 },
      { name: 'Accounting', path: '/accounting', icon: FiBook },
    ],
  },
  {
    id: 'transport',
    title: 'Transport',
    icon: FiTruck,
    items: [
      { name: 'Transport', path: '/transport', icon: FiTruck },
    ],
  },
  {
    id: 'staff-hr',
    title: 'HR & Payroll',
    icon: FiBriefcase,
    items: [
      { name: 'Dashboard', path: '/teachers', icon: FiGrid },
      { name: 'Staff', path: '/staff', icon: FiUsers },
      { name: 'Departments', path: '/hr/departments', icon: FiBriefcase },
      { name: 'Leave Management', path: '/hr/leave-management', icon: FiCalendar },
      { name: 'Payroll', path: '/payroll', icon: RupeeIcon },
      { name: 'ESS', path: '/ess', icon: FiMonitor },
      { name: 'Performance Tracking', path: '/teachers/performance', icon: FiTarget },
      { name: 'Teacher Ranking', path: '/teachers/ranking', icon: FiAward },
      { name: 'Daily Activities', path: '/teachers/daily-activities', icon: FiClock },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    icon: FiMessageSquare,
    items: [
      { name: 'SMS', path: '/communications?tab=sms', icon: FiMessageCircle },
      { name: 'WhatsApp', path: '/communications?tab=whatsapp', icon: FiMessageSquare },
      { name: 'Circulars', path: '/communications?tab=circulars', icon: FiBell },
      { name: 'Event Calendar', path: '/event-calendar', icon: FiCalendar },
      { name: 'Notifications', path: '/communications?tab=notifications', icon: FiBell },
      { name: 'Email Campaigns', path: '/communications?tab=email', icon: FiMail },
      { name: 'Message History', path: '/communications?tab=history', icon: FiClock },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: FiPackage,
    items: [
      { name: 'Inventory', path: '/inventory', icon: FiPackage },
      // { name: 'Library', path: '/inventory', icon: FiBook },
      // { name: 'Hostel', path: '/coming-soon?feature=hostel', icon: FiHome, comingSoon: true },
      // { name: 'Assets', path: '/inventory', icon: FiBox },
    ],
  },
  {
    id: 'library',
    title: 'Library',
    icon: FiBook,
    items: [
      { name: 'Library', path: '/library', icon: FiBook },
    ],
  },
  // {
  //   id: 'operations',
  //   title: 'Operations',
  //   icon: FiTruck,
  //   items: [
  //     // { name: 'Transport', path: '/transport', icon: FiTruck },
  //     { name: 'Inventory', path: '/inventory', icon: FiPackage },
  //     { name: 'Library', path: '/inventory', icon: FiBook },
  //     { name: 'Hostel', path: '/coming-soon?feature=hostel', icon: FiHome, comingSoon: true },
  //     { name: 'Assets', path: '/inventory', icon: FiBox },
  //     { name: 'Maintenance', path: '/settings?tab=maintenance', icon: FiTool },
  //   ],
  // },

  {
    id: 'settings',
    title: 'Settings',
    icon: FiSettings,
    items: [
      { name: 'School Setup', path: '/settings/setup', icon: FiTool },
      { name: 'System Settings', path: '/settings', icon: FiSettings },
      { name: 'User Access', path: '/settings/user-access', icon: FiUsers },
      { name: 'Staff Access', path: '/settings/staff-access', icon: FiUserCheck },
      { name: 'Report Settings', path: '/settings/reports', icon: FiFileText },
      { name: 'Theme', path: '/settings/theme', icon: FiMonitor },
    ],
  },
  
  // {
  //   id: 'administration',
  //   title: 'Administration',
  //   icon: FiSettings,
  //   items: [
  //     { name: 'School Setup', path: '/setup', icon: FiTool },
  //     { name: 'Academic Year', path: '/settings?tab=academic', icon: FiCalendar },
  //     { name: 'User Access', path: '/settings/user-access', icon: FiUsers },
  //     { name: 'Staff Access', path: '/settings/staff-access', icon: FiUserCheck },
  //     { name: 'Settings', path: '/settings', icon: FiSettings },
  //     { name: 'User Roles', path: '/settings?tab=users', icon: FiShield },
  //     {
  //       name: 'Permissions',
  //       path: '/coming-soon?feature=permissions',
  //       icon: FiLock,
  //       comingSoon: true,
  //     },
  //     {
  //       name: 'Audit Logs',
  //       path: '/coming-soon?feature=audit-logs',
  //       icon: FiFileText,
  //       comingSoon: true,
  //     },
  //     {
  //       name: 'Integrations',
  //       path: '/coming-soon?feature=integrations',
  //       icon: FiLink,
  //       comingSoon: true,
  //     },
  //   ],
  // },
];

export function isSingleItemNavGroup(group: NavGroup): boolean {
  return group.items.length === 1;
}

/** When a group has exactly one item, use it as a direct sidebar link (no expand/collapse). */
export function getNavGroupDirectLink(group: NavGroup): NavLink | null {
  return group.items.length === 1 ? group.items[0] : null;
}

/** Paths where only an exact match counts (not child routes). */
const EXACT_MATCH_PATHS = new Set([
  '/dashboard',
  '/settings',
  '/hr',
  '/teachers',
  '/fees',
  '/academics/classes',
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
