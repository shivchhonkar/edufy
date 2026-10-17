'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

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
    <div className={moduleTabBarClass}>
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={moduleTabClass(active)}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
