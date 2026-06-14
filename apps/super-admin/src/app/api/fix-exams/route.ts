import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureExamsSchema } from '@/lib/ensure-exams-schema';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);

    const verify = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'exams' 
      ORDER BY ordinal_position
    `);

    return NextResponse.json({
      success: true,
      message: 'Exams schema is up to date (subject_id, academic_year, exam_results).',
      columns: verify.rows,
    });
  } catch (error: any) {
    console.error('Error fixing exams table:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: 'Failed to add subject_id column. Error: ' + error.message
      },
      { status: 500 }
    );
  }
}


























































