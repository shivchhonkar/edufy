'use client'

import { useState } from 'react'

interface SchoolLogoProps {
  variant?: 'sidebar' | 'sidebar-collapsed' | 'login'
  className?: string
  src?: string
  alt?: string
}

function SchoolLogoFallback({
  alt,
  className = '',
  onLight = false,
}: {
  alt: string
  className?: string
  onLight?: boolean
}) {
  const initial = alt.charAt(0).toUpperCase() || 'S'
  return (
    <div
      className={`flex items-center justify-center rounded-lg font-semibold ${
        onLight ? 'bg-emerald-100 text-emerald-700' : 'bg-white/20 text-white'
      } ${className}`}
      title={alt}
      aria-hidden
    >
      {initial}
    </div>
  )
}

const sizeByVariant = {
  'sidebar-collapsed': 'h-12 w-12 text-base',
  sidebar: 'h-14 w-14 text-lg',
  login: 'h-16 w-16 text-xl',
} as const

export default function SchoolLogo({
  variant = 'sidebar',
  className = '',
  src,
  alt,
}: SchoolLogoProps) {
  const [failed, setFailed] = useState(false)
  const logoSrc = src?.trim() || ''
  const logoAlt = alt?.trim() || 'School logo'
  const sizeClass = sizeByVariant[variant]

  if (!logoSrc || failed) {
    return (
      <SchoolLogoFallback
        alt={logoAlt}
        className={`${sizeClass} ${className}`}
        onLight
      />
    )
  }

  return (
    <img
      src={logoSrc}
      alt={logoAlt}
      className={`${sizeClass} object-contain object-center ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
