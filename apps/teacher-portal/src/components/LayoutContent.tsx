'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { usePathname } from 'next/navigation'
import { SchoolBrandingProvider } from '@/contexts/SchoolBrandingContext'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (pathname === '/login') {
    return <SchoolBrandingProvider>{children}</SchoolBrandingProvider>
  }

  const marginLeft = isLargeScreen ? (sidebarCollapsed ? '5rem' : '16rem') : '0'

  return (
    <SchoolBrandingProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar onToggle={setSidebarCollapsed} />
        <div
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
          style={{ marginLeft }}
        >
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SchoolBrandingProvider>
  )
}
