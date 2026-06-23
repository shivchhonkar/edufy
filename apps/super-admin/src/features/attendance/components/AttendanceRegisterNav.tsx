'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiCalendar, FiCheckCircle, FiUsers } from 'react-icons/fi'

const LINKS = [
  { href: '/attendance', label: 'Student Register', icon: FiUsers, match: (path: string) => path === '/attendance' },
  {
    href: '/attendance/staff/register',
    label: 'Staff Register',
    icon: FiCalendar,
    match: (path: string) => path.startsWith('/attendance/staff/register'),
  },
  {
    href: '/attendance/students',
    label: 'Mark Student',
    icon: FiCheckCircle,
    match: (path: string) => path.startsWith('/attendance/students'),
  },
  {
    href: '/attendance/staff',
    label: 'Mark Staff',
    icon: FiCheckCircle,
    match: (path: string) =>
      path.startsWith('/attendance/staff') && !path.startsWith('/attendance/staff/register'),
  },
]

export default function AttendanceRegisterNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 pb-0.5">
      {LINKS.map((link) => {
        const Icon = link.icon
        const active = link.match(pathname)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? 'border-primary-600 text-primary-700 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Icon size={14} />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
