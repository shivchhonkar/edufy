'use client'

import type { ReactNode } from 'react'

type PortalPageShellProps = {
  title: string
  subtitle?: string
  greeting?: string
  children: ReactNode
}

export function PortalPageShell({ title, subtitle, greeting, children }: PortalPageShellProps) {
  const headerContent = (
    <div className="min-w-0">
      {greeting && <p className="portal-page-header-muted text-xs">{greeting}</p>}
      <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="portal-page-header-muted text-xs sm:text-sm">{subtitle}</p>}
    </div>
  )

  return (
    <div className="portal-page-shell min-h-full flex-1">
      <div className="portal-page-header lg:hidden">
        <div className="px-3 sm:px-6 py-3">{headerContent}</div>
      </div>
      <div className="portal-page-header hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 leading-tight">
            {headerContent}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8 min-w-0">
        {children}
      </div>
    </div>
  )
}

export function PortalLoadingSpinner() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="portal-spinner animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" />
    </div>
  )
}

export function PortalQuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color = 'blue',
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  href?: string
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'indigo'
}) {
  const colors = {
    blue: 'hover:border-blue-300 hover:bg-blue-50/50 group-hover:text-blue-700',
    green: 'hover:border-green-300 hover:bg-green-50/50 group-hover:text-green-700',
    purple: 'hover:border-purple-300 hover:bg-purple-50/50 group-hover:text-purple-700',
    amber: 'hover:border-amber-300 hover:bg-amber-50/50 group-hover:text-amber-700',
    indigo: 'hover:border-indigo-300 hover:bg-indigo-50/50 group-hover:text-indigo-700',
  }
  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }

  const className = `group block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${colors[color]}`

  const inner = (
    <>
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconColors[color]} mb-3`}
      >
        <Icon size={20} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 group-hover:text-inherit">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </>
  )

  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    )
  }

  return <div className={className}>{inner}</div>
}
