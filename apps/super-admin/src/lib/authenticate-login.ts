import { verifyPassword, generateToken } from '@edulakhya/auth';
import type { User } from '@edulakhya/types';
import type { RequestDb } from '@/lib/request-db';
import { signParentToken } from '@/lib/parent-auth';
import {
  findPortalLoginCandidates,
  verifyPortalPassword,
  resolvePortalChildrenIds,
  fetchChildrenByIds,
} from '@/lib/parent-students';

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

async function findStaffUserByLogin(db: RequestDb, login: string): Promise<User | null> {
  const trimmed = login.trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const byEmail = await db.query<User>(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true`,
      [trimmed],
    );
    return byEmail.rows[0] ?? null;
  }

  const normalized = normalizePhone(trimmed);
  if (normalized.length >= 10) {
    const byPhone = await db.query<User>(
      `SELECT * FROM users
       WHERE is_active = true
         AND regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $1`,
      [normalized],
    );
    if (byPhone.rows[0]) return byPhone.rows[0];
  }

  return null;
}

export type AuthenticatedLoginResult =
  | {
      kind: 'staff';
      user: User;
      token: string;
    }
  | {
      kind: 'parent';
      user: { login: string; children: Awaited<ReturnType<typeof fetchChildrenByIds>>; role: 'parent' };
      token: string;
    };

export async function authenticateUnifiedLogin(
  db: RequestDb,
  login: string,
  password: string,
  tenant?: { id: number; slug: string } | null,
): Promise<AuthenticatedLoginResult | { error: string; status: number }> {
  const trimmedLogin = login.trim();

  if (!trimmedLogin || !password) {
    return { error: 'User ID and password are required', status: 400 };
  }

  const staffUser = await findStaffUserByLogin(db, trimmedLogin);
  if (staffUser) {
    const valid = await verifyPassword(password, staffUser.password_hash as string);
    if (!valid) {
      return { error: 'Invalid credentials', status: 401 };
    }

    const tokenPayload: Parameters<typeof generateToken>[0] = {
      id: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
      full_name: staffUser.full_name,
    };
    if (tenant) {
      tokenPayload.tenant_id = tenant.id;
      tokenPayload.tenant_slug = tenant.slug;
    }

    const { password_hash: _p, ...userWithoutPassword } = staffUser as User & {
      password_hash?: string;
    };

    return {
      kind: 'staff',
      user: userWithoutPassword as User,
      token: generateToken(tokenPayload),
    };
  }

  const candidates = await findPortalLoginCandidates(db, trimmedLogin);
  if (candidates.length === 0) {
    return { error: 'Invalid credentials', status: 401 };
  }

  const matched = await verifyPortalPassword(candidates, password);
  if (!matched) {
    const hasAnyPassword = candidates.some((c) => c.portal_password_hash);
    return {
      error: hasAnyPassword
        ? 'Invalid credentials'
        : 'Portal password is not set for this account. Contact school administration.',
      status: 401,
    };
  }

  const studentIds = await resolvePortalChildrenIds(db, matched);
  const children = await fetchChildrenByIds(db, studentIds);

  if (children.length === 0) {
    return {
      error: 'Portal access has been disabled for this account. Contact school administration.',
      status: 403,
    };
  }

  const token = signParentToken({
    login: trimmedLogin,
    studentIds: children.map((c) => c.id),
    matchedStudentId: matched.id,
  });

  return {
    kind: 'parent',
    user: {
      login: trimmedLogin,
      children,
      role: 'parent',
    },
    token,
  };
}
