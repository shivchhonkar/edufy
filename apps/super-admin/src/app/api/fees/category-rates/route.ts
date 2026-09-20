import { NextRequest, NextResponse } from 'next/server';
import { applyCategoryRatesToStudents, requireFeeOps } from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;

    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const classId = request.nextUrl.searchParams.get('class_id');
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (academicYear) {
      params.push(academicYear);
      conditions.push(`r.academic_year = $${params.length}`);
    }
    if (classId) {
      params.push(Number(classId));
      conditions.push(`r.class_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await auth.db.query(
      `SELECT r.*, c.name AS class_name
       FROM fee_category_rates r
       LEFT JOIN classes c ON c.id = r.class_id
       ${where}
       ORDER BY c.name, r.fee_type, r.student_category`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing category rates:', error);
    return NextResponse.json({ success: false, error: 'Failed to load category-wise fees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();

    if (body.apply) {
      const updated = await applyCategoryRatesToStudents(
        auth.db,
        String(body.academic_year || ''),
        body.class_id ? Number(body.class_id) : undefined
      );
      return NextResponse.json({
        success: true,
        data: { updated },
        message: `Applied category rates to ${updated} fee record(s)`,
      });
    }

    const rates = Array.isArray(body.rates) ? body.rates : [body];
    const saved = [];
    for (const rate of rates) {
      const academicYear = String(rate.academic_year || '').trim();
      const classId = Number(rate.class_id);
      const feeType = String(rate.fee_type || '').trim();
      const studentCategory = String(rate.student_category || '').trim();
      const amount = parseFloat(String(rate.amount ?? 0));
      if (!academicYear || !classId || !feeType || !studentCategory) continue;

      const result = await auth.db.query(
        `INSERT INTO fee_category_rates (academic_year, class_id, fee_type, student_category, amount, frequency)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (academic_year, class_id, fee_type, student_category)
         DO UPDATE SET amount = EXCLUDED.amount, frequency = EXCLUDED.frequency, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [academicYear, classId, feeType, studentCategory, amount, rate.frequency || 'monthly']
      );
      saved.push(result.rows[0]);
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving category rates:', error);
    return NextResponse.json({ success: false, error: 'Failed to save category-wise fees' }, { status: 500 });
  }
}
