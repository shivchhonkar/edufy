import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { academicYearFilterValues } from '@/lib/fees/AcademicYear';

const OUTSTANDING_DUE_SQL = `CASE
  WHEN sf.amount_due > sf.amount_paid
    AND NOT (
      sf.status IN ('pending', 'partial', 'overdue')
      AND GREATEST(sf.amount_due - sf.amount_paid, 0) > 0
      AND (fs.id IS NULL OR fs.is_active = false)
    )
  THEN sf.amount_due - sf.amount_paid + COALESCE(sf.late_fee_amount, 0)
  ELSE 0
END`;

/** Students with outstanding fees for the academic year — used by management mobile app */
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const academicYear = await resolveAcademicYear(
      db,
      request.nextUrl.searchParams.get('academic_year'),
    );
    const yearFilter = academicYearFilterValues(academicYear);

    const result = await db.query<{
      id: number;
      first_name: string | null;
      last_name: string | null;
      admission_number: string | null;
      parent_name: string | null;
      parent_phone: string | null;
      class_name: string | null;
      section_name: string | null;
      amount_paid: string;
      amount_due: string;
    }>(
      `SELECT
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.parent_name,
        s.parent_phone,
        c.name AS class_name,
        sec.name AS section_name,
        COALESCE(SUM(sf.amount_paid), 0) AS amount_paid,
        COALESCE(SUM(${OUTSTANDING_DUE_SQL}), 0) AS amount_due
      FROM students s
      INNER JOIN student_fees sf ON sf.student_id = s.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.status = 'active'
      AND sf.academic_year = ANY($1::text[])
      GROUP BY
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.parent_name,
        s.parent_phone,
        c.name,
        sec.name
      HAVING COALESCE(SUM(${OUTSTANDING_DUE_SQL}), 0) > 0
      ORDER BY amount_due DESC, s.first_name ASC NULLS LAST, s.last_name ASC NULLS LAST`,
      [yearFilter],
    );

    const students = result.rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      admission_number: row.admission_number,
      parent_name: row.parent_name,
      parent_phone: row.parent_phone,
      class_name: row.class_name,
      section_name: row.section_name,
      amount_paid: parseFloat(row.amount_paid || '0'),
      amount_due: parseFloat(row.amount_due || '0'),
    }));

    return NextResponse.json({
      success: true,
      data: students,
      academic_year: academicYear,
      count: students.length,
    });
  } catch (error) {
    console.error('Error fetching students with dues:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch students with dues';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
