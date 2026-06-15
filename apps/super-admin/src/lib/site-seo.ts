import type { Metadata } from 'next';

export const SITE_NAME = 'Shribi Edufy';
export const SITE_TAGLINE = 'Best School ERP Software in India';
export const LOGO_SRC = '/shribi-smart-school-logo.png';

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:7000';

export const SITE_DESCRIPTION =
  'Shribi Edufy is an advanced School ERP for admissions, academics, fees, HR, transport, exams, report cards, and parent communication. Cloud-based multi-tenant platform built for Indian schools.';

export const SITE_KEYWORDS = [
  'school erp',
  'school management software',
  'school erp india',
  'fee management software',
  'report card software',
  'school crm',
  'cbse marksheet',
  'student information system',
  'Shribi Edufy',
  'school admin software',
  'transport management school',
  'exam management system',
];

const defaultOgImage = {
  url: LOGO_SRC,
  width: 512,
  height: 512,
  alt: `${SITE_NAME} — School ERP`,
};

/** Shared defaults for every page (favicon, metadataBase, etc.) */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  icons: {
    icon: [{ url: LOGO_SRC, type: 'image/png' }],
    shortcut: LOGO_SRC,
    apple: LOGO_SRC,
  },
  applicationName: SITE_NAME,
  authors: [{ name: 'Shribi', url: 'https://www.shribi.com' }],
  creator: 'Shribi',
  publisher: 'Shribi',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

/** Landing page (`/`) — full SEO */
export const landingMetadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [LOGO_SRC],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'education',
};
