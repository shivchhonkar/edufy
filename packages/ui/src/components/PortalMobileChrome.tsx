'use client'

type PortalSidebarBackdropProps = {
  open: boolean
  onClose: () => void
}

export function PortalSidebarBackdrop({ open, onClose }: PortalSidebarBackdropProps) {
  if (!open) return null

  return (
    <button
      type="button"
      className="fixed inset-0 z-40 bg-black/50 lg:hidden"
      onClick={onClose}
      aria-label="Close menu"
    />
  )
}

type PortalMobileTopBarProps = {
  title: string
  subtitle?: string
  onMenuClick: () => void
}

function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function PortalMobileTopBar({ title, subtitle, onMenuClick }: PortalMobileTopBarProps) {
  return (
    <header className="portal-mobile-topbar sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 shadow-sm lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="portal-mobile-menu-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle ? <p className="portal-mobile-topbar-muted truncate text-xs">{subtitle}</p> : null}
      </div>
    </header>
  )
}
