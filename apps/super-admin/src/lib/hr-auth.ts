// Backward-compatible re-exports — use @/lib/api-auth for new code
export {
  getTokenFromRequest,
  requireAuth,
  requireHrAdmin,
  requireHrRead,
  getStaffIdForUser,
  HR_ADMIN_ROLES,
  HR_READ_ROLES,
} from '@/lib/api-auth';

export type { AuthUser } from '@/lib/api-auth';
