'use client'

import { PortalPageShell } from '@edulakhya/ui'

export default function SectionPlaceholder({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <p className="text-slate-600">This section is being prepared and will be available soon.</p>
      </div>
    </PortalPageShell>
  )
}
