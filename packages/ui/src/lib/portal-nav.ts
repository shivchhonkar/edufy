export function portalNavLinkClass(isActive: boolean, displayCollapsed = false): string {
  return [
    'portal-nav-link group relative flex items-center my-1 px-3 py-3 rounded-lg transition-all duration-200',
    isActive ? 'portal-nav-link-active' : '',
    displayCollapsed ? 'justify-center' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
