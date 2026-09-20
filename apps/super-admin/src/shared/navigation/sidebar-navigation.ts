import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiAlertTriangle,
  FiArchive,
  FiArrowUpCircle,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBookmark,
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
  FiPhone,
  FiPieChart,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
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
import { AiFillDashboard } from 'react-icons/ai';
import { GrDashboard } from 'react-icons/gr';

export interface NavLink {
  name: string;
  path: string;
  icon: IconType;
  /** Shown as a subtle badge when the route is not fully built yet */
  comingSoon?: boolean;
  /** Nested links shown under this item (one extra indent in the sidebar). */
  items?: NavLink[];
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
    icon: GrDashboard,
    items: [
      { name: 'Dashboard', path: '/admin', icon: GrDashboard },
      // { name: 'Analytics', path: '/dashboard/analytics', icon: FiBarChart2 },
      // { name: 'Reports', path: '/settings/reports', icon: FiFileText },
      // { name: 'Activity Logs', path: '/dashboard/activity-logs', icon: FiActivity },
    ],
  },
  {
    id: 'visitor-management',
    title: 'Visitor Mgmt.',
    icon: FiUserCheck,
    items: [
      // { name: 'Admissions', path: '/admissions', icon: FiUserPlus },
      { name: 'Visitor Mgmt.', path: '/visitor-management', icon: FiUserCheck },
      // { name: 'Students', path: '/students', icon: FiUsers },
      // { name: 'Promotions', path: '/promotions', icon: FiArrowUpCircle },
    ],
  },
  {
    id: 'student-management',
    title: 'Students',
    icon: FiUsers,
    items: [
      { name: 'Enquiry', path: '/students/enquiry', icon: FiMessageSquare },
      { name: 'Registration', path: '/registration', icon: FiUserPlus },
      { name: 'Admissions', path: '/admissions', icon: FiUserPlus },
      { name: 'Physical Report', path: '/students/physical-report', icon: FiHeart },
      { name: 'PTM', path: '/students/ptm', icon: FiCalendar },
      { name: 'Certificates', path: '/students/certificates', icon: FiFileText },
      { name: 'List', path: '/students', icon: FiUsers },
      { name: 'Promote', path: '/promotions', icon: FiArrowUpCircle },
      {
        name: 'TC',
        path: '/students/transfer-certificates',
        icon: FiFilePlus,
      },
      { name: 'ID Cards', path: '/students/id-cards', icon: FiCreditCard },
      { name: 'Gate Pass', path: '/students/gate-pass', icon: FiShield },
      { name: 'Late Pass', path: '/students/late-pass', icon: FiClock },
      { name: 'Queries / Calls / PM', path: '/students/queries', icon: FiPhone },
      { name: 'Query Reports', path: '/students/query-reports', icon: FiClipboard },
      { name: 'Class-wise Summary', path: '/students/class-summary', icon: FiLayers },
      { name: 'Student Summary', path: '/students/student-summary', icon: FiList },
      { name: 'Left & TC', path: '/students/exit-students', icon: FiUserMinus },
      { name: 'Alumni', path: '/students/alumni-management', icon: FiUserCheck },
      { name: 'Reports', path: '/students/reports', icon: FiBarChart2 },
    ],
  },
  {
    id: 'employee-management',
    title: 'Staff Mgmt.',
    icon: FiBriefcase,
    items: [
      { name: 'List', path: '/staff', icon: FiUsers },
      {name: 'Teacher', path: '/academics/teachers', icon: FiUsers },
      // { name: 'Employee Attendance', path: '/attendance/staff', icon: FiUserCheck },
      { name: 'ID Cards', path: '/staff/id-cards', icon: FiCreditCard },
      { name: 'Documents', path: '/staff/documents', icon: FiFolder },
      { name: 'Reports', path: '/staff/reports', icon: FiBarChart2 },
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
      { name: 'Mark Employee Attendance', path: '/attendance/staff', icon: FiUserCheck },
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
      { name: 'Class Categories', path: '/academics/class-categories', icon: FiFolder },
      // { name: 'Sections', path: '/academics/classes?tab=sections', icon: FiGrid },
      { name: 'Subjects', path: '/academics/subjects', icon: FiBookOpen },
      { name: 'School Houses', path: '/academics/houses', icon: FiFlag },
      { name: 'Academics Assignments', path: '/academics/assignments', icon: FiFilePlus },
      { name: 'Teachers List', path: '/academics/teachers', icon: FiUsers },
      { name: 'Teacher Assignments', path: '/academics/teacher-assignments', icon: FiUserCheck },
      
      { name: 'Timetable(routine)', path: '/academics/timetable', icon: FiCalendar },
      { name: 'Lesson Plans', path: '/academics/classes?tab=lesson-plans', icon: FiList },
      // { name: 'Lesson Plans', path: '/academics/classes?tab=lesson-plans', icon: FiList },
      { name: 'Syllabus Tracking', path: '/academics/syllabus', icon: FiCheckSquare },
      { name: 'Calendar', path: '/academics/academic-calendar', icon: FiCalendar },
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
      { name: 'Exam Dates & Syllabus', path: '/exams/dates-syllabus', icon: FiCalendar },
      { name: 'Grade Master', path: '/exams/grades', icon: FiAward },
      { name: 'Marks Feeding', path: '/exams/marks', icon: FiEdit2 },
      { name: 'Import Marks', path: '/exams/import', icon: FiFilePlus },
      { name: 'Activities', path: '/exams/activities', icon: FiCheckSquare },
      { name: 'Activities Feeding', path: '/exams/activities/feeding', icon: FiEdit },
      { name: 'Class-wise Activity Feeding', path: '/exams/activities/class-feeding', icon: FiUsers },
      { name: 'Report Cards', path: '/exams/report-cards', icon: FiFileText },
      { name: 'Performance Report', path: '/exams/performance', icon: FiBarChart2 },
      { name: 'Online Exam Marks', path: '/exams/online-marks', icon: FiMonitor },
      { name: 'Exam Analytics', path: '/exams/analytics', icon: FiPieChart },
      { name: 'Rank Holders', path: '/exams/performance?view=ranks', icon: FiList },
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
      { name: 'Misc Fees Receipt', path: '/fees/misc-receipt', icon: FiFilePlus },
      { name: 'Import from Excel', path: '/fees/import', icon: FiFileText },
      { name: 'Student Ledger', path: '/fees/ledger', icon: FiUsers },
      { name: 'Receipts', path: '/fees/receipts', icon: FiPrinter },
      { name: 'Fee Register', path: '/fees/register', icon: FiList },
      { name: 'Fee Outstanding', path: '/fees/outstanding', icon: FiFileText },
      { name: 'Opening Outstandings', path: '/fees/opening-outstanding', icon: FiArchive },
      { name: 'Fee Structures', path: '/fees/setup/structures', icon: FiLayers },
      { name: 'Generate Fee Installments', path: '/fees/operations', icon: FiTool },
      { name: 'Send Fees Reminders', path: '/fees/reminders', icon: FiSend },
      { name: 'Reminder Report', path: '/fees/reminders/report', icon: FiClock },
      { name: 'Refund Voucher', path: '/fees/refunds', icon: RupeeIcon },
      { name: 'Fee Reversal', path: '/fees/reversals', icon: FiEdit2 },
      { name: 'Pending Mobile Receipts', path: '/fees/pending-mobile', icon: FiCreditCard },
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
      { name: 'Transport Students', path: '/transport/students', icon: FiUsers },
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
      { name: 'Dashboard', path: '/library', icon: FiBook },
      {
        name: 'Masters',
        path: '/library/masters',
        icon: FiLayers,
        items: [
          { name: 'Books', path: '/library/catalog/books', icon: FiBook },
          { name: 'Authors', path: '/library/masters/authors', icon: FiEdit2 },
          { name: 'Publishers', path: '/library/masters/publishers', icon: FiBookOpen },
          { name: 'Subjects', path: '/library/masters/subjects', icon: FiFolder },
          { name: 'Vendors', path: '/library/masters/vendors', icon: FiTruck },
          { name: 'Racks & Shelves', path: '/library/masters/racks', icon: FiGrid, comingSoon: true },
          { name: 'Fine Rules', path: '/library/masters/fines', icon: FiCreditCard },
        ],
      },
      {
        name: 'Circulation',
        path: '/library/circulation',
        icon: FiRefreshCw,
        items: [
          { name: 'Student Issue', path: '/library/students/issue', icon: FiPlus },
          { name: 'Student Return', path: '/library/students/return', icon: FiCheckCircle },
          { name: 'Staff Issue', path: '/library/staff/issue', icon: FiUserPlus },
          { name: 'Staff Return', path: '/library/staff/return', icon: FiUserCheck },
          { name: 'Renewals', path: '/library/circulation/renewals', icon: FiClock, comingSoon: true },
          { name: 'Reservations', path: '/library/circulation/reservations', icon: FiBookmark, comingSoon: true },
        ],
      },
      {
        name: 'Registers',
        path: '/library/registers',
        icon: FiClipboard,
        items: [
          { name: 'Book Register', path: '/library/reports/books', icon: FiList },
          { name: 'Issue & Return Register', path: '/library/reports/issue-return', icon: FiClipboard },
          { name: 'Issued Books', path: '/library/reports/issued', icon: FiArchive },
          { name: 'Overdue Books', path: '/library/registers/overdue', icon: FiClock },
          { name: 'Lost / Damaged Books', path: '/library/registers/lost', icon: FiAlertTriangle },
        ],
      },
      {
        name: 'Fines',
        path: '/library/fines',
        icon: RupeeIcon,
        items: [
          { name: 'Pending Fines', path: '/library/fines/pending', icon: FiClock },
          { name: 'Fine Collection', path: '/library/fines/collection', icon: RupeeIcon, comingSoon: true },
          { name: 'Fine History', path: '/library/fines/history', icon: FiList },
        ],
      },
      {
        name: 'Reports',
        path: '/library/reports',
        icon: FiBarChart2,
        items: [
          { name: 'Stock Report', path: '/library/reports/stock', icon: FiPackage },
          { name: 'Issue Report', path: '/library/reports/issue', icon: FiPlus },
          { name: 'Return Report', path: '/library/reports/return', icon: FiCheckCircle },
          { name: 'Overdue Report', path: '/library/reports/overdue', icon: FiClock },
          { name: 'Student Report', path: '/library/reports/students', icon: FiUsers },
          { name: 'Staff Report', path: '/library/reports/staff', icon: FiUser },
        ],
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: FiPackage,
    items: [
      { name: 'Dashboard', path: '/inventory', icon: FiPackage },
      {
        name: 'Masters',
        path: '/inventory/items',
        icon: FiLayers,
        items: [
          { name: 'Item Master', path: '/inventory/items', icon: FiPackage },
          { name: 'Categories', path: '/inventory/categories', icon: FiFolder },
          { name: 'Units', path: '/inventory/units', icon: FiGrid },
          { name: 'Vendors', path: '/inventory/vendors', icon: FiTruck },
          { name: 'Stores', path: '/inventory/locations', icon: FiHome },
        ],
      },
      {
        name: 'Procurement',
        path: '/inventory/purchase-requests',
        icon: FiClipboard,
        items: [
          { name: 'Purchase Request', path: '/inventory/purchase-requests', icon: FiFilePlus },
          { name: 'Purchase Order', path: '/inventory/purchase-orders', icon: FiFileText },
          { name: 'GRN / Goods Receipt', path: '/inventory/grn', icon: FiBox },
        ],
      },
      {
        name: 'Stock',
        path: '/inventory/stock',
        icon: FiArchive,
        items: [
          { name: 'Stock In/Out', path: '/inventory/stock-move', icon: FiRefreshCw },
          { name: 'Issue / Sell', path: '/inventory/issue', icon: FiUserPlus },
          { name: 'Return', path: '/inventory/return', icon: FiCheckCircle },
          { name: 'Stock Transfer', path: '/inventory/transfer', icon: FiTruck },
          { name: 'Stock Adjustment', path: '/inventory/adjustment', icon: FiEdit2 },
          { name: 'Current Stock', path: '/inventory/stock', icon: FiPackage },
          { name: 'Stock Ledger', path: '/inventory/ledger', icon: FiList },
          { name: 'Low Stock Alerts', path: '/inventory/alerts', icon: FiFlag },
          { name: 'Physical Verification', path: '/inventory/verification', icon: FiCheckSquare },
        ],
      },
      {
        name: 'Assets',
        path: '/inventory/assets',
        icon: FiMonitor,
        items: [
          { name: 'Asset Register', path: '/inventory/assets', icon: FiMonitor },
        ],
      },
      { name: 'Barcode / QR', path: '/inventory/barcode', icon: FiCreditCard },
      { name: 'Reports', path: '/inventory/reports', icon: FiBarChart2 },
      { name: 'Audit Trail', path: '/inventory/audit', icon: FiShield },
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
      { name: 'School Settings', path: '/settings/setup', icon: FiTool },
      { name: 'Student Master Data', path: '/settings/student-lookups', icon: FiList },
      { name: 'Holidays', path: '/settings/holidays', icon: FiCalendar },
      { name: 'Working Days', path: '/settings/working-days', icon: FiClock },
      { name: 'Age Restrictions', path: '/settings/age-restrictions', icon: FiUser },

//       School Profile
// Logo
// Academic Session
// School Contact Details
// School Address
// School Timing
// School Documents

      { name: 'Manage Student Access', path: '/settings/user-access', icon: FiUsers },

//       Roles
// Permissions
// User Groups
// Admin Access

      { name: 'Manage Employee Access', path: '/settings/staff-access', icon: FiUserCheck },

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

      { name: 'Theme Settings', path: '/settings/theme', icon: FiMonitor },

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
  '/admin',
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
  '/inventory/items',
  '/inventory/stock',
  '/inventory/assets',
  '/library',
  '/library/masters',
  '/library/circulation',
  '/library/registers',
  '/library/fines',
  '/library/reports',
]);

export function isNavLinkActive(pathname: string, linkPath: string): boolean {
  const [path] = linkPath.split('?');

  if (EXACT_MATCH_PATHS.has(path)) {
    return pathname === path;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isNavItemTreeActive(pathname: string, item: NavLink): boolean {
  if (isNavLinkActive(pathname, item.path)) return true;
  return item.items?.some((child) => isNavItemTreeActive(pathname, child)) ?? false;
}

export function findActiveGroupId(pathname: string): string | null {
  for (const group of SIDEBAR_NAV_GROUPS) {
    if (group.items.some((item) => isNavItemTreeActive(pathname, item))) {
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

export function nestedNavKey(groupId: string, itemPath: string) {
  return `${groupId}:${itemPath}`;
}

export function getInitialExpandedNested(pathname: string): Record<string, boolean> {
  const expanded: Record<string, boolean> = {};
  for (const group of SIDEBAR_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.items?.length && isNavItemTreeActive(pathname, item)) {
        expanded[nestedNavKey(group.id, item.path)] = true;
      }
    }
  }
  return expanded;
}

