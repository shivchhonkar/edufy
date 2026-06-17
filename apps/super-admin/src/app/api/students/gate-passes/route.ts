import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureGatePassSchema } from '@/lib/ensure-gate-pass-schema';
import { getPaginationParams } from '@/lib/utils';
import {
  buildGatePassStudentSnapshot,
  generateGatePassNumber,
  isValidCollectorRelationship,
} from '@/lib/gate-pass-utils';
import type { Student } from '@/shared/types';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureGatePassSchema(db);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const fromDate = searchParams.get('from_date')?.trim() || '';
    const toDate = searchParams.get('to_date')?.trim() || '';

    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        gp.pass_number ILIKE $${paramIndex}
        OR gp.collector_name ILIKE $${paramIndex}
        OR gp.collector_mobile ILIKE $${paramIndex}
        OR gp.student_snapshot->>'full_name' ILIKE $${paramIndex}
        OR gp.student_snapshot->>'admission_number' ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    if (status) {
      conditions.push(`gp.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (fromDate) {
      conditions.push(`COALESCE(gp.exit_at, gp.created_at) >= $${paramIndex}::date`);
      params.push(fromDate);
      paramIndex += 1;
    }

    if (toDate) {
      conditions.push(`COALESCE(gp.exit_at, gp.created_at) < ($${paramIndex}::date + INTERVAL '1 day')`);
      params.push(toDate);
      paramIndex += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM student_gate_passes gp ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const listResult = await db.query(
      `SELECT gp.*
       FROM student_gate_passes gp
       ${whereClause}
       ORDER BY COALESCE(gp.exit_at, gp.created_at) DESC
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
    console.error('Error fetching gate passes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gate pass history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;

    await ensureGatePassSchema(db);

    const body = await request.json();
    const {
      student_id,
      collector_name,
      collector_mobile,
      collector_relationship,
      collector_photo_url,
      reason,
      notes,
    } = body;

    const studentId = parseInt(String(student_id), 10);
    if (!studentId || Number.isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'Valid student_id is required' }, { status: 400 });
    }

    if (!collector_name?.trim() || !collector_mobile?.trim() || !reason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Collector name, mobile, and reason are required' },
        { status: 400 }
      );
    }

    if (!isValidCollectorRelationship(String(collector_relationship || ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid collector relationship' },
        { status: 400 }
      );
    }

    const studentResult = await db.query<Student & { class_name?: string; section_name?: string }>(
      `SELECT s.*, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1`,
      [studentId]
    );

    const student = studentResult.rows[0];
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const passNumber = await generateGatePassNumber(db);
    const snapshot = await buildGatePassStudentSnapshot(db, student);
    const issuerName =
      (user as { full_name?: string }).full_name || user.email || `User #${user.id}`;

    const insertResult = await db.query(
      `INSERT INTO student_gate_passes (
        pass_number, student_id, student_snapshot,
        collector_name, collector_mobile, collector_relationship, collector_photo_url,
        reason, status, created_by, created_by_name, notes
      ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
      RETURNING *`,
      [
        passNumber,
        studentId,
        JSON.stringify(snapshot),
        collector_name.trim(),
        collector_mobile.trim(),
        collector_relationship,
        collector_photo_url || null,
        reason.trim(),
        user.id,
        issuerName,
        notes?.trim() || null,
      ]
    );

    return NextResponse.json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('Error creating gate pass:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create gate pass' },
      { status: 500 }
    );
  }
}
