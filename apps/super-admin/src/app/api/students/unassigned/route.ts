import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { studentCountSearchSql } from '@/lib/student-search';

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const search = request.nextUrl.searchParams.get('search')?.trim() || '';

    let deleteQuery = `DELETE FROM students WHERE class_id IS NULL AND status = 'active'`;
    const params: string[] = [];
    let paramCount = 0;

    if (search) {
      paramCount += 1;
      deleteQuery += ` AND ${studentCountSearchSql(paramCount)}`;
      params.push(`%${search}%`);
    }

    deleteQuery += ' RETURNING id';

    const result = await db.query(deleteQuery, params);
    const deleted = result.rowCount ?? result.rows.length;

    return NextResponse.json({
      success: true,
      data: { deleted },
      message: `Deleted ${deleted} unassigned student(s)`,
    });
  } catch (error) {
    console.error('Error deleting unassigned students:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to delete unassigned students. Some records may have linked attendance, fees, or other data.',
      },
      { status: 500 },
    );
  }
}
