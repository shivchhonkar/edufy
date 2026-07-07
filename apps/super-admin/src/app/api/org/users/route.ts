import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationAuth } from '@/lib/request-db';
import { createOrganizationUser } from '@/lib/org-auth';
import { createPlatformPool, getControlDbConfig } from '@/lib/platform-db-config';

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  const pool = createPlatformPool(getControlDbConfig());
  try {
    const users = await pool.query(
      `SELECT ou.id, ou.email, ou.full_name, ou.role, ou.is_active, ou.created_at,
              COALESCE(json_agg(json_build_object(
                'tenant_id', usa.tenant_id,
                'role', usa.role,
                'is_default', usa.is_default
              )) FILTER (WHERE usa.id IS NOT NULL), '[]') AS school_access
       FROM organization_users ou
       LEFT JOIN user_school_access usa ON usa.organization_user_id = ou.id
       WHERE ou.organization_id = $1
       GROUP BY ou.id
       ORDER BY ou.full_name`,
      [auth.organizationId],
    );
    return NextResponse.json({ success: true, data: users.rows });
  } finally {
    await pool.end();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!['org_owner', 'org_admin', 'super_admin'].includes(String(auth.user.role))) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const user = await createOrganizationUser({
      organization_id: auth.organizationId,
      email: String(body.email || ''),
      password: String(body.password || ''),
      full_name: String(body.full_name || ''),
      role: body.role ? String(body.role) : 'org_admin',
      school_ids: Array.isArray(body.school_ids)
        ? body.school_ids.map((id: unknown) => parseInt(String(id), 10)).filter(Number.isFinite)
        : undefined,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Create org user error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 },
    );
  }
}
