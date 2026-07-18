export function getSchoolAdminBaseUrl(subdomain: string | null, slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN || 'localhost:7000';
  const host = (subdomain || slug).trim().toLowerCase();
  return `http://${host}.${base}`;
}

export function getSchoolAdminLoginUrl(subdomain: string | null, slug: string): string {
  return `${getSchoolAdminBaseUrl(subdomain, slug)}/login`;
}
