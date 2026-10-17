'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { moduleTabBarClass, moduleTabClass } from '@/shared/components/common/ModuleTabs';

const links = [
  // { href: '/teachers', label: 'Dashboard' },
  // { href: '/academics/teacher-assignments', label: 'Subject Assignment' },
  { href: '/teachers/timetable', label: 'Timetable' },
  { href: '/teachers/daily-activities', label: 'Daily Activities' },
  { href: '/teachers/performance', label: 'Performance' },
  { href: '/teachers/ranking', label: 'Top Ranking' },
  // { href: '/academics/syllabus', label: 'Syllabus Progress' },
];

export default function TeacherNav() {
  const pathname = usePathname();
  return (
    <div className={moduleTabBarClass}>
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== '/teachers' && pathname.startsWith(link.href));
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
