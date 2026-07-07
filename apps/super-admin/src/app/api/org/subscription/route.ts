import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationAuth } from '@/lib/request-db';
import { createPlatformPool, getControlDbConfig } from '@/lib/platform-db-config';

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  const pool = createPlatformPool(getControlDbConfig());
  try {
    const org = await pool.query(
      `SELECT o.*,
        (SELECT json_build_object(
          'plan', s.plan,
          'status', s.status,
          'school_count_limit', s.school_count_limit,
          'valid_until', s.valid_until
        ) FROM organization_subscriptions s
         WHERE s.organization_id = o.id AND s.status = 'active'
         ORDER BY s.valid_until DESC NULLS LAST LIMIT 1) AS subscription
       FROM organizations o WHERE o.id = $1`,
      [auth.organizationId],
    );

    return NextResponse.json({ success: true, data: org.rows[0] ?? null });
  } finally {
    await pool.end();
  }
}
