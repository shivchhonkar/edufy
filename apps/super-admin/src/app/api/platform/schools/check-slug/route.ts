import { NextRequest, NextResponse } from 'next/server';
import { ensureControlDatabase } from '@/lib/ensure-control-db';
import { createPlatformPool, getControlDbConfig } from '@/lib/platform-db-config';

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

  const pool = createPlatformPool(getControlDbConfig());

  try {
    const result = await pool.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
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
