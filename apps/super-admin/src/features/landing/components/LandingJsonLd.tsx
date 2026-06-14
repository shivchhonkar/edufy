import {
  LOGO_SRC,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site-seo';

export default function LandingJsonLd() {
  const logoUrl = `${SITE_URL}${LOGO_SRC}`;

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: logoUrl,
    description: SITE_DESCRIPTION,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-9650593896',
      contactType: 'sales',
      email: 'info@shribi.com',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: ['https://www.shribi.com'],
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: logoUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      description: 'Free school setup and demo available',
    },
    featureList: [
      'Student Information System',
      'Fee Management',
      'Exam & Report Cards',
      'HR & Payroll',
      'Transport Management',
      'Parent Communication',
    ],
    provider: {
      '@type': 'Organization',
      name: 'Shribi',
      url: 'https://www.shribi.com',
    },
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: 'Shribi',
      logo: { '@type': 'ImageObject', url: logoUrl },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
