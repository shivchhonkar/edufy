'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/teachers', label: 'Dashboard' },
  { href: '/academics/teacher-assignments', label: 'Subject Assignment' },
  { href: '/teachers/timetable', label: 'Timetable' },
  { href: '/teachers/daily-activities', label: 'Daily Activities' },
  { href: '/teachers/performance', label: 'Performance' },
  { href: '/teachers/ranking', label: 'Top Ranking' },
  { href: '/academics/syllabus', label: 'Syllabus Progress' },
];

export default function TeacherNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== '/teachers' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-0 text-sm font-medium transition-colors ${
              active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
