'use client'

import { useCallback, useEffect, useState } from 'react'
import { getPortalMainOffsetClass } from '../lib/portal-layout'

export function usePortalSidebar() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileOpen,
    openMobile,
    closeMobile,
    mainOffsetClass: getPortalMainOffsetClass(sidebarCollapsed),
  }
}
