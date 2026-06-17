import type { Metadata } from 'next'

export const PLATFORM_NAME = 'Shribi Edufy'
export const DEFAULT_FAVICON = '/shribi-smart-school-logo.png'
export const PARENT_PORTAL_LABEL = 'Parent Portal'

export const SITE_URL =
  process.env.NEXT_PUBLIC_PARENT_PORTAL_URL?.replace(/\/$/, '') || 'http://localhost:7001'

export const SITE_DESCRIPTION =
  'Parent portal to view your child\'s attendance, fees, homework, results, and report cards. Powered by Shribi Edufy School ERP.'

export function buildRootMetadata(branding: {
  school_name: string
  favicon_url: string
}): Metadata {
  const schoolName = branding.school_name?.trim() || 'School'
  const favicon = branding.favicon_url?.trim() || DEFAULT_FAVICON

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${schoolName} — ${PARENT_PORTAL_LABEL}`,
      template: `%s | ${schoolName}`,
    },
    description: `${schoolName} parent portal — ${SITE_DESCRIPTION}`,
    icons: {
      icon: [{ url: favicon, type: 'image/png' }],
      shortcut: favicon,
      apple: favicon,
    },
    applicationName: `${schoolName} ${PARENT_PORTAL_LABEL}`,
    authors: [{ name: 'Shribi', url: 'https://www.shribi.com' }],
    creator: 'Shribi',
    publisher: 'Shribi',
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: schoolName,
      title: `${schoolName} — ${PARENT_PORTAL_LABEL}`,
      description: SITE_DESCRIPTION,
      images: favicon ? [{ url: favicon, alt: `${schoolName} logo` }] : undefined,
    },
    robots: {
      index: false,
      follow: false,
    },
  }
}
