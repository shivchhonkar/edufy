import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationAuth } from '@/lib/request-db';
import { createPlatformPool, getControlDbConfig } from '@/lib/platform-db-config';

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  const pool = createPlatformPool(getControlDbConfig());
  try {
    const result = await pool.query(
      `SELECT * FROM admission_leads WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [auth.organizationId],
    );
    return NextResponse.json({ success: true, data: result.rows });
  } finally {
    await pool.end();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const pool = createPlatformPool(getControlDbConfig());
  try {
    const result = await pool.query(
      `INSERT INTO admission_leads
        (organization_id, target_tenant_id, student_name, parent_name, parent_phone, parent_email, grade_interest, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        auth.organizationId,
        body.target_tenant_id ?? null,
        body.student_name,
        body.parent_name ?? null,
        body.parent_phone ?? null,
        body.parent_email ?? null,
        body.grade_interest ?? null,
        body.source ?? 'web',
        body.notes ?? null,
      ],
    );
    return NextResponse.json({ success: true, data: result.rows[0] });
  } finally {
    await pool.end();
  }
}
