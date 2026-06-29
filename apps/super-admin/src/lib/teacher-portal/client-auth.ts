import { getClientToken } from '@/lib/client-auth';

export function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = getClientToken() || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
