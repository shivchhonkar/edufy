'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/exams', label: 'Exams', exact: true },
  { href: '/exams/dates-syllabus', label: 'Dates & Syllabus' },
  { href: '/exams/grades', label: 'Grade Master' },
  { href: '/exams/marks', label: 'Marks Feeding' },
  { href: '/exams/import', label: 'Import Marks' },
  { href: '/exams/activities', label: 'Activities' },
  { href: '/exams/report-cards', label: 'Report Cards' },
  { href: '/exams/performance', label: 'Performance' },
];

export default function ExamModuleLinks() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              active ? 'bg-primary-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
