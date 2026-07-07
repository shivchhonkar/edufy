import { verifyPassword, generateToken, type TokenInput } from '@edulakhya/auth';
import type { Organization, OrganizationUser, Tenant } from '@edulakhya/types';
import {
  getOrganizationByHost,
  getOrganizationById,
  getSchoolsForOrganization,
  getTenantById,
  controlPool,
} from '@edulakhya/tenant';
import { createPlatformPool, getControlDbConfig } from '@/lib/platform-db-config';

export interface AccessibleSchool {
  id: number;
  name: string;
  slug: string;
  is_primary: boolean;
  city: string | null;
}

export interface OrgLoginResult {
  token: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: string;
    user_type: 'organization';
    organization_id: number;
    organization_slug: string;
    tenant_id?: number;
    tenant_slug?: string;
    school_id?: number;
    school_slug?: string;
  };
  organization: { id: number; name: string; slug: string };
  schools: AccessibleSchool[];
  activeSchool: AccessibleSchool | null;
  requires_school_selection: boolean;
}

const ORG_OWNER_ROLES = new Set(['org_owner', 'org_admin']);

async function queryControl<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await controlPool.query<T>(text, params);
  return result.rows;
}

export async function findOrganizationUser(
  organizationId: number,
  login: string,
): Promise<(OrganizationUser & { password_hash: string }) | null> {
  const trimmed = login.trim().toLowerCase();
  const rows = await queryControl<OrganizationUser & { password_hash: string }>(
    `SELECT * FROM organization_users
     WHERE organization_id = $1 AND is_active = true
       AND LOWER(email) = $2`,
    [organizationId, trimmed],
  );
  return rows[0] ?? null;
}

export async function getAccessibleSchoolsForOrgUser(
  orgUser: OrganizationUser,
  organizationId: number,
): Promise<AccessibleSchool[]> {
  if (ORG_OWNER_ROLES.has(orgUser.role)) {
    const all = await getSchoolsForOrganization(organizationId);
    return all.map(mapSchool);
  }

  const rows = await queryControl<Tenant & { is_default: boolean }>(
    `SELECT t.*, usa.is_default
     FROM user_school_access usa
     INNER JOIN tenants t ON t.id = usa.tenant_id
     WHERE usa.organization_user_id = $1
       AND t.organization_id = $2
       AND t.is_active = true
     ORDER BY usa.is_default DESC, t.name ASC`,
    [orgUser.id, organizationId],
  );

  if (rows.length > 0) {
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      is_primary: r.is_primary ?? false,
      city: r.city ?? null,
    }));
  }

  const all = await getSchoolsForOrganization(organizationId);
  return all.map(mapSchool);
}

function mapSchool(t: Tenant): AccessibleSchool {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    is_primary: t.is_primary ?? false,
    city: t.city ?? null,
  };
}

function pickDefaultSchool(schools: AccessibleSchool[]): AccessibleSchool | null {
  if (schools.length === 0) return null;
  return schools.find((s) => s.is_primary) ?? schools[0];
}

export async function authenticateOrganizationLogin(
  organization: Organization,
  login: string,
  password: string,
  options?: { preferredSchoolId?: number },
): Promise<OrgLoginResult | { error: string; status: number }> {
  const orgUser = await findOrganizationUser(organization.id, login);
  if (!orgUser) {
    return { error: 'Invalid credentials', status: 401 };
  }

  const valid = await verifyPassword(password, orgUser.password_hash);
  if (!valid) {
    return { error: 'Invalid credentials', status: 401 };
  }

  const schools = await getAccessibleSchoolsForOrgUser(orgUser, organization.id);
  const preferredSchool =
    options?.preferredSchoolId != null
      ? schools.find((s) => s.id === options.preferredSchoolId) ?? null
      : null;
  const activeSchool =
    preferredSchool ??
    (schools.length === 1 ? schools[0] : pickDefaultSchool(schools));
  const requiresSchoolSelection = schools.length > 1 && !activeSchool;

  const accessibleIds = schools.map((s) => s.id);

  const tokenInput: TokenInput = {
    id: orgUser.id,
    email: orgUser.email,
    full_name: orgUser.full_name,
    role: orgUser.role === 'org_viewer' ? 'org_viewer' : 'org_admin',
    user_type: 'organization',
    organization_id: organization.id,
    organization_slug: organization.slug,
    accessible_school_ids: accessibleIds,
  };

  if (activeSchool && !requiresSchoolSelection) {
    tokenInput.tenant_id = activeSchool.id;
    tokenInput.tenant_slug = activeSchool.slug;
    tokenInput.school_id = activeSchool.id;
    tokenInput.school_slug = activeSchool.slug;
  }

  const token = generateToken(tokenInput);

  return {
    token,
    user: {
      id: orgUser.id,
      email: orgUser.email,
      full_name: orgUser.full_name,
      role: tokenInput.role!,
      user_type: 'organization',
      organization_id: organization.id,
      organization_slug: organization.slug,
      tenant_id: tokenInput.tenant_id,
      tenant_slug: tokenInput.tenant_slug,
      school_id: tokenInput.school_id,
      school_slug: tokenInput.school_slug,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    schools,
    activeSchool: requiresSchoolSelection ? null : activeSchool,
    requires_school_selection: requiresSchoolSelection,
  };
}

/** Resolve which schools the current auth may access (always fresh from control DB). */
export async function resolveAccessibleSchoolsForAuth(
  auth: TokenInput,
): Promise<AccessibleSchool[]> {
  if (!auth.organization_id) return [];

  const organization = await getOrganizationById(auth.organization_id);
  if (!organization) return [];

  let schools: AccessibleSchool[] = [];

  if (auth.user_type === 'organization') {
    const orgUser = await queryControl<OrganizationUser>(
      'SELECT * FROM organization_users WHERE id = $1 AND organization_id = $2',
      [auth.id, auth.organization_id],
    );
    if (orgUser[0]) {
      schools = await getAccessibleSchoolsForOrgUser(orgUser[0], organization.id);
    }
  } else {
    // School-local users on org portal — same list as org session (includes newly added schools)
    schools = (await getSchoolsForOrganization(organization.id)).map(mapSchool);
  }

  const seen = new Set<number>();
  return schools.filter((school) => {
    if (seen.has(school.id)) return false;
    seen.add(school.id);
    return true;
  });
}

export async function buildSchoolSwitchToken(
  auth: TokenInput,
  schoolId: number,
): Promise<{ token: string; school: AccessibleSchool } | { error: string; status: number }> {
  if (!auth.organization_id) {
    return { error: 'Organization context required', status: 403 };
  }

  const accessibleSchools = await resolveAccessibleSchoolsForAuth(auth);
  const allowed = accessibleSchools.some((school) => school.id === schoolId);

  if (!allowed) {
    return { error: 'You do not have access to this school', status: 403 };
  }

  const school = await getTenantById(schoolId);
  if (!school || school.organization_id !== auth.organization_id) {
    return { error: 'School not found', status: 404 };
  }

  const token = generateToken({
    ...auth,
    user_type: auth.user_type ?? 'organization',
    tenant_id: school.id,
    tenant_slug: school.slug,
    school_id: school.id,
    school_slug: school.slug,
    accessible_school_ids: accessibleSchools.map((s) => s.id),
  });

  return {
    token,
    school: mapSchool(school),
  };
}

export async function getOrgSessionPayload(auth: TokenInput) {
  if (!auth.organization_id) return null;

  const organization = await getOrganizationById(auth.organization_id);
  if (!organization) return null;

  const schools = await resolveAccessibleSchoolsForAuth(auth);

  const activeId = auth.tenant_id ?? auth.school_id;
  const activeSchool = activeId ? schools.find((s) => s.id === activeId) ?? null : null;

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
    },
    schools,
    activeSchool,
    canSwitchSchool: schools.length > 1,
  };
}

export async function resolveOrganizationFromHost(host: string | null) {
  if (!host) return null;
  return getOrganizationByHost(host);
}

/** Create org user (Phase 4 admin UI) */
export async function createOrganizationUser(input: {
  organization_id: number;
  email: string;
  password: string;
  full_name: string;
  role?: string;
  school_ids?: number[];
}) {
  const { hashPassword } = await import('@edulakhya/auth');
  const pool = createPlatformPool(getControlDbConfig());
  try {
    const passwordHash = await hashPassword(input.password);
    const userResult = await pool.query(
      `INSERT INTO organization_users
        (organization_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, organization_id, email, full_name, role, is_active, created_at`,
      [
        input.organization_id,
        input.email.trim().toLowerCase(),
        passwordHash,
        input.full_name.trim(),
        input.role || 'org_admin',
      ],
    );
    const user = userResult.rows[0];

    if (input.school_ids?.length) {
      for (let i = 0; i < input.school_ids.length; i++) {
        await pool.query(
          `INSERT INTO user_school_access (organization_user_id, tenant_id, role, is_default)
           VALUES ($1, $2, 'school_admin', $3)
           ON CONFLICT (organization_user_id, tenant_id) DO NOTHING`,
          [user.id, input.school_ids[i], i === 0],
        );
      }
    }

    return user;
  } finally {
    await pool.end();
  }
}

export async function enrichSchoolLoginToken(
  tokenPayload: TokenInput,
  tenant: { id: number; slug: string; organization_id?: number | null },
): Promise<string> {
  if (!tenant.id) {
    return generateToken({ ...tokenPayload, user_type: 'school_local' });
  }

  if (!tenant.organization_id) {
    return generateToken({
      ...tokenPayload,
      user_type: 'school_local',
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      school_id: tenant.id,
      school_slug: tenant.slug,
    });
  }

  const org = await getOrganizationById(tenant.organization_id);
  const schools = org ? await getSchoolsForOrganization(org.id) : [];

  return generateToken({
    ...tokenPayload,
    user_type: 'school_local',
    organization_id: tenant.organization_id,
    organization_slug: org?.slug,
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    school_id: tenant.id,
    school_slug: tenant.slug,
    accessible_school_ids: schools.map((s) => s.id),
  });
}
