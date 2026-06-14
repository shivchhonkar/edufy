import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '20', 10),
      100
    );

    const result = await db.query(
      `SELECT c.*, cl.name AS class_name, sec.name AS section_name
       FROM sms_campaigns c
       LEFT JOIN classes cl ON c.class_id = cl.id
       LEFT JOIN sections sec ON c.section_id = sec.id
       ORDER BY c.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching SMS campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns. Run phase7_sms_communications migration.' },
      { status: 500 }
    );
  }
}
