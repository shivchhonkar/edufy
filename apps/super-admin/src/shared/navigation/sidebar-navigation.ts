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
  FiMap,
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
  FiUserMinus,
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
    id: 'staff-management',
    title: 'Staff',
    icon: FiBriefcase,
    items: [
      { name: 'Staff', path: '/staff', icon: FiUsers },
      { name: 'Staff Attendance', path: '/attendance/staff', icon: FiUserCheck },
      { name: 'Staff ID Cards', path: '/staff/id-cards', icon: FiCreditCard },
      { name: 'Staff Documents', path: '/staff/documents', icon: FiFolder },
      { name: 'Staff Reports', path: '/staff/reports', icon: FiBarChart2 },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    icon: FiUserCheck,
    items: [
      { name: 'Student Register', path: '/attendance', icon: FiCalendar },
      { name: 'Staff Register', path: '/attendance/staff/register', icon: FiUsers },
      { name: 'Mark Student Attendance', path: '/attendance/students', icon: FiCheckCircle },
      { name: 'Mark Staff Attendance', path: '/attendance/staff', icon: FiUserCheck },
      { name: 'Attendance Reports', path: '/attendance/reports', icon: FiBarChart2 },
      {
        name: 'Biometric Integration',
        path: '/coming-soon?feature=biometric',
        icon: FiCpu,
        comingSoon: true,
      },
    ],
  },
  {
    id: 'academics',
    title: 'Academics',
    icon: FiBook,
    items: [
      { name: 'Classes & Sections', path: '/academics/classes', icon: FiLayers },
      // { name: 'Sections', path: '/academics/classes?tab=sections', icon: FiGrid },
      { name: 'Subjects', path: '/academics/subjects', icon: FiBookOpen },
      { name: 'School Houses', path: '/academics/houses', icon: FiFlag },
      { name: 'Teacher Assignments', path: '/academics/teacher-assignments', icon: FiUserCheck },
      
      { name: 'Timetable', path: '/academics/timetable', icon: FiCalendar },
      { name: 'Lesson Plans', path: '/academics/classes?tab=lesson-plans', icon: FiList },
      // { name: 'Lesson Plans', path: '/academics/classes?tab=lesson-plans', icon: FiList },
      { name: 'Syllabus Tracking', path: '/academics/syllabus', icon: FiCheckSquare },
      { name: 'Academic Calendar', path: '/academics/academic-calendar', icon: FiCalendar },
    ],
  },
  
  {
    id: 'homework',
    title: 'Homework',
    icon: FiBookOpen,
    items: [
      { name: 'Homework', path: '/homework', icon: FiClipboard },      
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
      { name: 'Fee Setup', path: '/fees/setup', icon: FiSettings },
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
    id: 'transport',
    title: 'Transport',
    icon: FiTruck,
    items: [
      { name: 'Dashboard', path: '/transport/dashboard', icon: FiTruck },      
      { name: 'Vehicles', path: '/transport/vehicles', icon: FiTruck },      
      { name: 'Drivers', path: '/transport/driver-management', icon: FiUser },
      { name: 'Routes & Stops', path: '/transport/routes', icon: FiMap },
      { name: 'Student Allocation', path: '/transport/route-assignments', icon: FiTruck },
      { name: 'Route Assignments', path: '/transport/current-assignments', icon: FiTruck },
    ],
  },
  {
    id: 'staff-hr',
    title: 'HR & Payroll',
    icon: FiBriefcase,
    items: [
      { name: 'Dashboard', path: '/hr/dashboard', icon: FiGrid },
      { name: 'Departments', path: '/hr/departments', icon: FiBriefcase },
      { name: 'Designations', path: '/hr/designations', icon: FiBriefcase },
      { name: 'Shifts', path: '/hr/shifts', icon: FiClock },

      { name: 'Leave Management', path: '/hr/leave-management', icon: FiCalendar },
      { name: 'Daily Activities', path: '/teachers/daily-activities', icon: FiClock },
      { name: 'Performance Tracking', path: '/teachers/performance', icon: FiTarget },

      { name: 'Promotions', path: '/hr/promotions', icon: FiArrowUpCircle },
      { name: 'Increments', path: '/hr/increments', icon: FiArrowUpCircle },
      { name: 'Resignations', path: '/hr/resignations', icon: FiUserMinus },

      { name: 'Salary Structures', path: '/hr/salary-structures', icon: FiLayers },      
      { name: 'Payroll', path: '/payroll', icon: RupeeIcon },

      // { name: 'ESS', path: '/ess', icon: FiMonitor },      
      // { name: 'Teacher Ranking', path: '/teachers/ranking', icon: FiAward },
     
      { name: 'Reports', path: '/hr/reports', icon: FiBarChart2 },

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

//       School Profile
// Logo
// Academic Session
// School Contact Details
// School Address
// School Timing
// School Documents

      { name: 'User Access', path: '/settings/user-access', icon: FiUsers },

//       Roles
// Permissions
// User Groups
// Admin Access

      { name: 'Staff Access', path: '/settings/staff-access', icon: FiUserCheck },

//       Teacher Login
// Employee Portal Access
// ESS Access
// Password Reset

{ name: 'Notification Settings', path: '/settings/notifications', icon: FiBell },
// SMS Templates
// WhatsApp Templates
// Email Templates
// Birthday Automation
// Fee Reminder Automation
// Attendance Alerts


      { name: 'Report Settings', path: '/settings/reports', icon: FiFileText },

//       Report Header
// School Logo
// Signatures
// Watermarks
// Certificate Templates
// Report Card Templates

      { name: 'Theme', path: '/settings/theme', icon: FiMonitor },

//       Color Scheme
// Sidebar Layout
// Dashboard Layout

      { name: 'System Settings', path: '/settings', icon: FiSettings },

//       SMS Settings
// WhatsApp Settings
// Email Settings
// Backup Settings
// API Settings
// Integrations
// Audit Logs
// Database Settings



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
  '/hr/dashboard',
  '/teachers',
  '/fees',
  '/fees/setup',
  '/academics/classes',
  '/students',
  '/staff',
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

