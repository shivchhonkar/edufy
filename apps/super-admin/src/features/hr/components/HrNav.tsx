'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/hr', label: 'Overview' },
  { href: '/hr/departments', label: 'Departments' },
  { href: '/hr/designations', label: 'Designations' },
  { href: '/hr/leaves', label: 'Leaves' },
  { href: '/hr/shifts', label: 'Shifts' },
  { href: '/hr/salary-structures', label: 'Salary Structures' },
  { href: '/hr/promotions', label: 'Promotions' },
  { href: '/hr/increments', label: 'Increments' },
  { href: '/hr/resignations', label: 'Resignations' },
  { href: '/hr/teacher-assignments', label: 'Teacher Assignments' },
  { href: '/hr/reports', label: 'Reports' },
];

export default function HrNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-3 py-1.5 rounded-0 text-sm font-medium transition-colors ${
            pathname === link.href
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
