import { NextRequest, NextResponse } from 'next/server';
import {
  FEE_STUDENT_FROM,
  FEE_STUDENT_SELECT,
  ensureOpeningFeeStructure,
  requireFeeOps,
} from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const classId = request.nextUrl.searchParams.get('class_id');
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';

    const params: unknown[] = [];
    const conditions: string[] = [];
    if (academicYear) {
      params.push(academicYear);
      conditions.push(`ob.academic_year = $${params.length}`);
    }
    if (classId) {
      params.push(Number(classId));
      conditions.push(`COALESCE(ce.class_id, s.class_id) = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        s.first_name ILIKE $${params.length}
        OR s.last_name ILIKE $${params.length}
        OR s.admission_number ILIKE $${params.length}
      )`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await auth.db.query(
      `SELECT ob.*, ${FEE_STUDENT_SELECT}
       FROM fee_opening_balances ob
       JOIN students s ON s.id = ob.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       ${where}
       ORDER BY c.name, s.first_name`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing opening balances:', error);
    return NextResponse.json({ success: false, error: 'Failed to load opening outstandings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const studentId = Number(body.student_id);
    const academicYear = String(body.academic_year || '').trim();
    const amount = parseFloat(String(body.amount ?? 0));
    const remarks = String(body.remarks || 'Opening outstanding').trim();

    if (!studentId || !academicYear || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Student, academic year, and amount are required' },
        { status: 400 }
      );
    }

    const structureId = await ensureOpeningFeeStructure(auth.db, academicYear);
    const existing = await auth.db.query<{ id: number; student_fee_id: number | null }>(
      `SELECT id, student_fee_id FROM fee_opening_balances WHERE student_id = $1 AND academic_year = $2`,
      [studentId, academicYear]
    );

    let studentFeeId = existing.rows[0]?.student_fee_id ?? null;
    if (studentFeeId) {
      await auth.db.query(
        `UPDATE student_fees
         SET amount_due = $1, remarks = $2, status = CASE WHEN amount_paid >= $1 THEN 'paid' WHEN amount_paid > 0 THEN 'partial' ELSE 'pending' END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [amount, remarks, studentFeeId]
      );
    } else {
      const created = await auth.db.query<{ id: number }>(
        `INSERT INTO student_fees (
           student_id, fee_structure_id, academic_year, amount_due, amount_paid, due_date, status, remarks
         ) VALUES ($1, $2, $3, $4, 0, CURRENT_DATE, 'pending', $5)
         RETURNING id`,
        [studentId, structureId, academicYear, amount, remarks]
      );
      studentFeeId = created.rows[0].id;
    }

    const result = await auth.db.query(
      `INSERT INTO fee_opening_balances (student_id, academic_year, amount, remarks, student_fee_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (student_id, academic_year)
       DO UPDATE SET amount = EXCLUDED.amount, remarks = EXCLUDED.remarks, student_fee_id = EXCLUDED.student_fee_id
       RETURNING *`,
      [studentId, academicYear, amount, remarks, studentFeeId, auth.user.id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error saving opening balance:', error);
    return NextResponse.json({ success: false, error: 'Failed to save opening outstanding' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const id = Number(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const current = await auth.db.query<{ student_fee_id: number | null }>(
      `SELECT student_fee_id FROM fee_opening_balances WHERE id = $1`,
      [id]
    );
    const feeId = current.rows[0]?.student_fee_id;
    await auth.db.query(`DELETE FROM fee_opening_balances WHERE id = $1`, [id]);
    if (feeId) {
      await auth.db.query(
        `DELETE FROM student_fees WHERE id = $1 AND amount_paid = 0 AND remarks ILIKE '%opening%'`,
        [feeId]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opening balance:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete opening outstanding' }, { status: 500 });
  }
}
