'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import {
  FiHome,
  FiCalendar,
  FiClipboard,
  FiBookOpen,
  FiMenu,
  FiChevronsLeft,
  FiLogOut,
} from 'react-icons/fi'
import SchoolLogo from '@/components/SchoolLogo'
import { useSchoolBranding } from '@/contexts/SchoolBrandingContext'
import { TEACHER_PORTAL_LABEL } from '@/lib/site-seo'

interface SidebarProps {
  onToggle?: (collapsed: boolean) => void
}

const menuItems = [
  { name: 'Dashboard', icon: FiHome, path: '/' },
  { name: 'Attendance', icon: FiCalendar, path: '/attendance' },
  { name: 'Homework', icon: FiBookOpen, path: '/homework' },
  { name: 'Leave', icon: FiClipboard, path: '/leaves' },
]

export default function Sidebar({ onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { branding } = useSchoolBranding()
  const schoolName = branding.school_name?.trim() || 'School'
  const schoolLogo = branding.logo_url?.trim() || ''

  const initialCollapsedState = useMemo(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('teacherSidebarCollapsed')
      if (savedState === null) {
        localStorage.setItem('teacherSidebarCollapsed', 'false')
        return false
      }
      return savedState === 'true'
    }
    return false
  }, [])

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsedState)

  useEffect(() => {
    onToggle?.(isCollapsed)
  }, [isCollapsed, onToggle])

  if (pathname === '/login') return null

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('teacherSidebarCollapsed', String(newState))
    onToggle?.(newState)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    document.cookie = 'token=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <div
      className={`h-full text-white fixed left-0 top-0 overflow-y-auto transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: '#047857' }}
    >
      <div className={isCollapsed ? 'p-4' : 'px-5 py-4'}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/95 p-1 shadow-sm"
              title={schoolName}
            >
              <SchoolLogo variant="sidebar-collapsed" src={schoolLogo} alt={schoolName} />
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-emerald-600 rounded-lg transition-all duration-300"
              title="Expand Menu"
            >
              <FiMenu size={22} className="text-emerald-200" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-sm">
                <SchoolLogo variant="sidebar" src={schoolLogo} alt={schoolName} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-white leading-snug line-clamp-2" title={schoolName}>
                  {schoolName}
                </h1>
                <p className="text-xs text-emerald-200 truncate">{TEACHER_PORTAL_LABEL}</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 p-2 hover:bg-emerald-600 rounded-lg transition-all duration-300 mt-0.5"
              title="Collapse Menu"
            >
              <FiChevronsLeft size={20} className="text-emerald-200" />
            </button>
          </div>
        )}
      </div>

      <nav className="px-3 flex-1">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`group relative flex items-center my-1 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon className={`flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} size={20} />
              {!isCollapsed && <span className="text-sm font-medium truncate flex-1">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-emerald-600">
        <button
          onClick={handleLogout}
          className={`group relative flex items-center w-full px-3 py-3 rounded-lg transition-all duration-200 text-emerald-100 hover:bg-emerald-600 hover:text-white ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <FiLogOut className={`flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} size={20} />
          {!isCollapsed && <span className="text-sm font-medium truncate flex-1">Logout</span>}
        </button>
      </div>
    </div>
  )
}
