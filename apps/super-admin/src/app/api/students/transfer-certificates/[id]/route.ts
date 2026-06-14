import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureTcSchema } from '@/lib/ensure-tc-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureTcSchema(db);

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (Number.isNaN(recordId)) {
      return NextResponse.json({ success: false, error: 'Invalid record id' }, { status: 400 });
    }

    const result = await db.query(
      `SELECT
         tcg.id,
         tcg.student_id,
         tcg.tc_number,
         tcg.generated_by,
         COALESCE(tcg.generated_by_name, u.full_name) AS generated_by_name,
         tcg.generated_at,
         tcg.academic_year,
         tcg.student_snapshot,
         tcg.school_snapshot,
         tcg.options
       FROM transfer_certificate_generations tcg
       LEFT JOIN users u ON tcg.generated_by = u.id
       WHERE tcg.id = $1`,
      [recordId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Transfer certificate GET by id:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfer certificate record' },
      { status: 500 }
    );
  }
}
