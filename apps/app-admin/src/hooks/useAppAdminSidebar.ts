'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPortalMainOffsetClass } from '@edulakhya/ui';

function readInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('appAdminSidebarCollapsed') === 'true';
}

export function useAppAdminSidebar() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(readInitialCollapsed());
    setReady(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileOpen,
    openMobile,
    closeMobile,
    ready,
    mainOffsetClass: getPortalMainOffsetClass(sidebarCollapsed),
  };
}
