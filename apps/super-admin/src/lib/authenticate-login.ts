import { verifyPassword, generateToken } from '@edulakhya/auth';
import type { User, Tenant } from '@edulakhya/types';
import type { RequestDb } from '@/lib/request-db';
import { signParentToken } from '@/lib/parent-auth';
import { enrichSchoolLoginToken } from '@/lib/org-auth';
import {
  findPortalLoginCandidates,
  verifyPortalPassword,
  resolvePortalChildrenIds,
  fetchChildrenByIds,
  type PortalChild,
} from '@/lib/parent-students';

function toStaffUserResponse(user: User & { password_hash?: string }) {
  return {
    id: Number(user.id),
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    phone: user.phone ?? null,
    is_active: user.is_active,
  };
}

function toParentUserResponse(login: string, children: PortalChild[]) {
  return {
    login,
    role: 'parent' as const,
    children: children.map((child) => ({
      id: Number(child.id),
      first_name: child.first_name,
      middle_name: child.middle_name ?? null,
      last_name: child.last_name,
      admission_number: child.admission_number,
      roll_number: child.roll_number ?? null,
      gender: child.gender ?? null,
      date_of_birth: child.date_of_birth ?? null,
      blood_group: child.blood_group ?? null,
      photo_url: child.photo_url ?? null,
      status: child.status,
      class_name: child.class_name ?? null,
      section_name: child.section_name ?? null,
      current_academic_year: child.current_academic_year ?? null,
      portal_access_enabled: child.portal_access_enabled,
      effective_permissions: child.effective_permissions,
    })),
  };
}

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
  tenant?: (Pick<Tenant, 'id' | 'slug' | 'organization_id'> & { school_code?: string }) | null,
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

    const tokenPayload = {
      id: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
      full_name: staffUser.full_name,
    };

    const token = tenant
      ? await enrichSchoolLoginToken(tokenPayload, tenant)
      : generateToken({ ...tokenPayload, user_type: 'school_local' });

    return {
      kind: 'staff',
      user: toStaffUserResponse(staffUser),
      token,
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
    tenant_id: tenant?.id,
    tenant_slug: tenant?.slug,
    organization_id: tenant?.organization_id ?? undefined,
    school_code: tenant?.school_code,
  });

  return {
    kind: 'parent',
    user: toParentUserResponse(trimmedLogin, children),
    token,
  };
}
