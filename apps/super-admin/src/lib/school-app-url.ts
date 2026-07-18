import { extractSubdomain } from '@/lib/tenant-host';

export function resolveAppBaseHost(host?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN?.trim();
  if (fromEnv) {
    return fromEnv.replace(/^https?:\/\//, '');
  }

  const current = host ?? (typeof window !== 'undefined' ? window.location.host : null);
  if (!current) return 'localhost:7000';

  const subdomain = extractSubdomain(current);
  if (subdomain) {
    const port = current.includes(':') ? `:${current.split(':')[1]}` : '';
    const hostname = current.split(':')[0].toLowerCase();
    if (hostname.endsWith('.localhost')) {
      return `localhost${port || ':7000'}`;
    }

    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return `${parts.slice(1).join('.')}${port}`;
    }
  }

  return current;
}

export function buildSchoolAppUrl(
  schoolSlug: string,
  path = '/admin',
  host?: string | null,
): string {
  const slug = schoolSlug.trim().toLowerCase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const baseHost = resolveAppBaseHost(host);
  return `${protocol}//${slug}.${baseHost}${normalizedPath}`;
}

export function isCurrentSchoolHost(schoolSlug: string, host?: string | null): boolean {
  const current = host ?? (typeof window !== 'undefined' ? window.location.host : null);
  if (!current) return false;
  return extractSubdomain(current)?.toLowerCase() === schoolSlug.trim().toLowerCase();
}

export function redirectToSchoolApp(schoolSlug: string, path?: string): void {
  if (typeof window === 'undefined') return;

  const targetPath = path ?? `${window.location.pathname}${window.location.search}`;
  window.location.href = buildSchoolAppUrl(schoolSlug, targetPath || '/admin');
}
