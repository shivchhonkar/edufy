import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ensureControlDatabase } from '@/lib/ensure-control-db';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (!slug || slug.length < 3) {
    return NextResponse.json({ success: true, data: { available: false, reason: 'Too short' } });
  }

  try {
    await ensureControlDatabase();
  } catch {
    return NextResponse.json({
      success: true,
      data: { available: true, slug, note: 'Control DB initializing' },
    });
  }

  const pool = new Pool({
    host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
    database: process.env.CONTROL_DB_NAME || 'edulakhya_control',
    user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || '',
  });

  try {
    const result = await pool.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [slug]
    );
    await pool.end();

    return NextResponse.json({
      success: true,
      data: { available: result.rows.length === 0, slug },
    });
  } catch {
    await pool.end().catch(() => {});
    return NextResponse.json({
      success: true,
      data: { available: true, slug, note: 'Control DB not configured — slug check skipped' },
    });
  }
}
