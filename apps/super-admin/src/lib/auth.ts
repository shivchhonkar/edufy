// Re-export from shared auth package (includes tenant_id in JWT)
export {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  decodeToken,
  hasRole,
  isAuthenticated,
  getUserFromToken,
} from '@EduLakhya/auth';

export type { JwtPayload } from '@EduLakhya/auth';
