import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    // Check all columns in exams table
    const result = await db.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'exams' 
      ORDER BY ordinal_position
    `);

    const hasSubjectId = result.rows.some(row => row.column_name === 'subject_id');

    return NextResponse.json({
      success: true,
      tableExists: result.rows.length > 0,
      hasSubjectId: hasSubjectId,
      columns: result.rows,
      message: hasSubjectId 
        ? '✅ subject_id column EXISTS' 
        : '❌ subject_id column MISSING'
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        tableExists: false
      },
      { status: 500 }
    );
  }
}


























































