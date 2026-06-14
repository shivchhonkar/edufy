import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register-school'],
      disallow: ['/dashboard', '/api/', '/settings'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
