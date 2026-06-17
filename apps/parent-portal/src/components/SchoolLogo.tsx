const DEFAULT_LOGO = '/shribi-smart-school-logo.png'

interface SchoolLogoProps {
  variant?: 'sidebar' | 'sidebar-collapsed'
  className?: string
  src?: string
  alt?: string
}

export default function SchoolLogo({
  variant = 'sidebar',
  className = '',
  src,
  alt,
}: SchoolLogoProps) {
  const logoSrc = DEFAULT_LOGO //src?.trim() || DEFAULT_LOGO
  const logoAlt = alt?.trim() || 'School logo'

  if (variant === 'sidebar-collapsed') {
    return (
      <img
        src={logoSrc}
        alt={logoAlt}
        className={`h-9 w-9 object-contain ${className}`}
      />
    )
  }

  return (
    <img
      src={logoSrc}
      alt={logoAlt}
      className={`h-full w-full max-h-10 max-w-full object-contain object-center ${className}`}
    />
  )
}
