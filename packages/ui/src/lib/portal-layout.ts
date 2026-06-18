export type PortalSidebarProps = {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function getPortalSidebarDrawerClasses(
  mobileOpen: boolean,
  isCollapsed: boolean,
  extra = '',
): string {
  const width = isCollapsed ? 'lg:w-20' : 'lg:w-64'
  return [
    'fixed inset-y-0 left-0 z-50 h-full w-64 overflow-y-auto',
    'transition-transform duration-300 ease-in-out',
    width,
    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

export function getPortalMainOffsetClass(sidebarCollapsed: boolean): string {
  return sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
}
