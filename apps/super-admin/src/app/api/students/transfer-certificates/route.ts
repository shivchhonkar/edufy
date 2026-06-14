import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureTcSchema } from '@/lib/ensure-tc-schema';
import { getPaginationParams } from '@/lib/utils';
import type { TransferCertificateLogEntry } from '@/features/students/utils/transfer-certificate-record';

const MAX_ENTRIES_PER_REQUEST = 50;

function isValidOptions(value: unknown): value is TransferCertificateLogEntry['options'] {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.tcNumber === 'string' &&
    typeof o.issueDate === 'string' &&
    typeof o.dateOfLeaving === 'string' &&
    typeof o.reasonForLeaving === 'string' &&
    typeof o.conduct === 'string' &&
    typeof o.qualifiedForPromotion === 'string'
  );
}

function isValidEntry(value: unknown): value is TransferCertificateLogEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.student_id === 'number' &&
    e.student_id > 0 &&
    typeof e.tc_number === 'string' &&
    e.tc_number.trim().length > 0 &&
    isValidOptions(e.options) &&
    e.student_snapshot !== null &&
    typeof e.student_snapshot === 'object' &&
    e.school_snapshot !== null &&
    typeof e.school_snapshot === 'object'
  );
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureTcSchema(db);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search')?.trim() || '';
    const studentId = searchParams.get('student_id');
    const fromDate = searchParams.get('from_date')?.trim() || '';
    const toDate = searchParams.get('to_date')?.trim() || '';

    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        tcg.tc_number ILIKE $${paramIndex}
        OR tcg.student_snapshot->>'full_name' ILIKE $${paramIndex}
        OR tcg.student_snapshot->>'admission_number' ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    if (studentId) {
      const parsedStudentId = parseInt(studentId, 10);
      if (!Number.isNaN(parsedStudentId)) {
        conditions.push(`tcg.student_id = $${paramIndex}`);
        params.push(parsedStudentId);
        paramIndex += 1;
      }
    }

    if (fromDate) {
      conditions.push(`tcg.generated_at >= $${paramIndex}::date`);
      params.push(fromDate);
      paramIndex += 1;
    }

    if (toDate) {
      conditions.push(`tcg.generated_at < ($${paramIndex}::date + INTERVAL '1 day')`);
      params.push(toDate);
      paramIndex += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM transfer_certificate_generations tcg
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const listResult = await db.query(
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
       ${whereClause}
       ORDER BY tcg.generated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageLimit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        items: listResult.rows,
        total,
        page,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error('Transfer certificates GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfer certificate history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user, db } = authResult;

    await ensureTcSchema(db);

    const body = await request.json();
    const entries = body?.entries;
    const academicYear =
      typeof body?.academic_year === 'string' ? body.academic_year.trim() || null : null;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one entry is required' },
        { status: 400 }
      );
    }

    if (entries.length > MAX_ENTRIES_PER_REQUEST) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_ENTRIES_PER_REQUEST} certificates per request` },
        { status: 400 }
      );
    }

    if (!entries.every(isValidEntry)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transfer certificate entry payload' },
        { status: 400 }
      );
    }

    const generatedByName = user.full_name?.trim() || user.email || 'Unknown user';
    const insertedIds: number[] = [];

    await db.transaction(async (client) => {
      for (const entry of entries as TransferCertificateLogEntry[]) {
        const result = await client.query<{ id: number }>(
          `INSERT INTO transfer_certificate_generations (
             student_id,
             tc_number,
             generated_by,
             generated_by_name,
             academic_year,
             student_snapshot,
             school_snapshot,
             options
           ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
           RETURNING id`,
          [
            entry.student_id,
            entry.tc_number.trim(),
            user.id,
            generatedByName,
            academicYear,
            JSON.stringify(entry.student_snapshot),
            JSON.stringify(entry.school_snapshot),
            JSON.stringify(entry.options),
          ]
        );
        insertedIds.push(result.rows[0].id);
      }
    });

    return NextResponse.json({
      success: true,
      data: { ids: insertedIds, count: insertedIds.length },
    });
  } catch (error) {
    console.error('Transfer certificates POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save transfer certificate history' },
      { status: 500 }
    );
  }
}
