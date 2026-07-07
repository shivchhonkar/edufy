import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationAuth } from '@/lib/request-db';
import { createPlatformPool, getControlDbConfig } from '@/lib/platform-db-config';

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAuth(request);
  if (auth instanceof NextResponse) return auth;

  const pool = createPlatformPool(getControlDbConfig());
  try {
    const result = await pool.query(
      `SELECT * FROM curriculum_templates WHERE organization_id = $1 ORDER BY name`,
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
      `INSERT INTO curriculum_templates (organization_id, name, description, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *`,
      [
        auth.organizationId,
        body.name,
        body.description ?? null,
        JSON.stringify(body.payload ?? {}),
      ],
    );
    return NextResponse.json({ success: true, data: result.rows[0] });
  } finally {
    await pool.end();
  }
}
