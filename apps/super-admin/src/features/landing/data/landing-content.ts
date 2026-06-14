export const STATS = [
  { value: '500+', label: 'Schools Empowered' },
  { value: '50+', label: 'Integrated Modules' },
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '24/7', label: 'Expert Support' },
];

export const MODULE_TABS = [
  { id: 'academics', label: 'Academics' },
  { id: 'administration', label: 'Administration' },
  { id: 'finance', label: 'Finance' },
  { id: 'hr', label: 'Human Resource' },
  { id: 'communication', label: 'Communication' },
] as const;

export type ModuleTabId = (typeof MODULE_TABS)[number]['id'];

export const MODULES: Record<
  ModuleTabId,
  { title: string; description: string; icon: string }[]
> = {
  academics: [
    {
      title: 'Student Information System',
      description:
        'Maintain detailed student profiles with admission history, guardians, documents, and academic records in one place.',
      icon: 'users',
    },
    {
      title: 'Attendance Management',
      description:
        'Track student and staff attendance daily with reports, summaries, and optional biometric integration.',
      icon: 'check',
    },
    {
      title: 'Homework & Assignments',
      description:
        'Create, distribute, and track homework and project work with submission status and teacher feedback.',
      icon: 'book',
    },
    {
      title: 'Exams & Report Cards',
      description:
        'Plan exams, upload results, generate CBSE-style marksheets, and publish report cards online.',
      icon: 'award',
    },
    {
      title: 'Timetable & Syllabus',
      description:
        'Build class timetables, assign teachers to periods, and monitor syllabus completion progress.',
      icon: 'calendar',
    },
    {
      title: 'Teacher Performance',
      description:
        'Monitor daily activities, lesson delivery, rankings, and syllabus progress for every educator.',
      icon: 'chart',
    },
  ],
  administration: [
    {
      title: 'Admissions & Enquiries',
      description:
        'Streamline enquiry-to-enrollment with follow-ups, document collection, and one-click student conversion.',
      icon: 'userplus',
    },
    {
      title: 'Transport Management',
      description:
        'Manage routes, stops, vehicle assignments, and sync transport fees automatically with student records.',
      icon: 'truck',
    },
    {
      title: 'Inventory Management',
      description:
        'Track uniforms, books, stationery, and school assets with stock levels, issues, and purchase history.',
      icon: 'box',
    },
    {
      title: 'Classes & Sections',
      description:
        'Configure academic structure, subjects, class teachers, and student promotions year over year.',
      icon: 'layers',
    },
    {
      title: 'School Setup Wizard',
      description:
        'Guided onboarding for academic year, fee structures, classes, and initial configuration.',
      icon: 'settings',
    },
    {
      title: 'Multi-Tenant Platform',
      description:
        'Run multiple schools on isolated databases with subdomain-based access and centralized control.',
      icon: 'cloud',
    },
  ],
  finance: [
    {
      title: 'Fee Management',
      description:
        'Assign fee structures, collect payments, send overdue reminders, and manage concessions with receipts.',
      icon: 'dollar',
    },
    {
      title: 'Bulk Fee Collection',
      description:
        'Record tuition and transport fees together with month-wise selection and printable payment receipts.',
      icon: 'credit',
    },
    {
      title: 'Financial Accounting',
      description:
        'Ledger-based accounting with income, expenses, and financial reports for complete visibility.',
      icon: 'pie',
    },
    {
      title: 'Fee Reports & Analytics',
      description:
        'Dashboards for collections, pending dues, class-wise summaries, and academic year comparisons.',
      icon: 'chart',
    },
    {
      title: 'Auto Fee Assignment',
      description:
        'Automatically assign recurring fees to students when structures or classes are updated.',
      icon: 'refresh',
    },
    {
      title: 'Transport Fee Sync',
      description:
        'Link transport routes to monthly fee records so billing stays accurate when routes change.',
      icon: 'link',
    },
  ],
  hr: [
    {
      title: 'Staff & HR Management',
      description:
        'Employee profiles, departments, designations, documents, and complete HR lifecycle management.',
      icon: 'briefcase',
    },
    {
      title: 'Payroll Processing',
      description:
        'Salary structures, increments, payslips, and automated payroll runs with deduction handling.',
      icon: 'wallet',
    },
    {
      title: 'Leave Management',
      description:
        'Apply, approve, and track staff leave balances with calendar views and policy enforcement.',
      icon: 'calendar',
    },
    {
      title: 'Shift & Attendance',
      description:
        'Define work shifts, mark staff attendance, and integrate with payroll for accurate payouts.',
      icon: 'clock',
    },
    {
      title: 'Recruitment & Onboarding',
      description:
        'Manage vacancies, applications, and smooth onboarding for new teachers and admin staff.',
      icon: 'userplus',
    },
    {
      title: 'Employee Self Service',
      description:
        'Staff portal for leave requests, payslip downloads, and personal profile updates.',
      icon: 'monitor',
    },
  ],
  communication: [
    {
      title: 'SMS & Notifications',
      description:
        'Send fee reminders, exam alerts, and announcements via SMS with template management.',
      icon: 'message',
    },
    {
      title: 'Parent Communications',
      description:
        'Keep parents informed with notices, homework updates, and fee payment confirmations.',
      icon: 'bell',
    },
    {
      title: 'Report Card Publishing',
      description:
        'Publish marksheets and report cards online with QR verification for authenticity.',
      icon: 'file',
    },
    {
      title: 'Circulars & Notices',
      description:
        'Create and distribute school circulars instantly to selected classes or the whole school.',
      icon: 'mail',
    },
    {
      title: 'Multi-Language Support',
      description:
        'Communicate effectively with parents across regions using configurable language options.',
      icon: 'globe',
    },
    {
      title: 'Mobile-Ready Access',
      description:
        'Responsive platform accessible on desktop, tablet, and mobile for admins and staff on the go.',
      icon: 'phone',
    },
  ],
};

export const BENEFITS = [
  {
    title: 'All-in-One Platform',
    description: 'One unified system for admissions, academics, fees, HR, transport, and more — no scattered tools.',
  },
  {
    title: 'Cloud-Based & Secure',
    description: 'Multi-tenant architecture with isolated school databases and role-based access control.',
  },
  {
    title: 'Easy to Implement',
    description: 'Guided school setup wizard gets your institution live quickly with minimal IT overhead.',
  },
  {
    title: 'Scalable for Any Size',
    description: 'From single-campus schools to growing groups — scale modules as your needs expand.',
  },
];

export const NAV_LINKS = [
  { href: '#modules', label: 'Modules' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
];
