import { NextRequest, NextResponse } from 'next/server';
import { parseAcademicYear } from '@/lib/fees/AcademicYear';
import { requireFeeOps } from '@/lib/fee-operations-utils';
import { RECEIPT_PREFIX } from '@/lib/fees/constants';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;

    const year = request.nextUrl.searchParams.get('academic_year') || '';
    const params: unknown[] = [];
    let where = '';
    if (year) {
      params.push(parseAcademicYear(year).name);
      where = 'WHERE academic_year = $1';
    }

    const result = await auth.db.query(
      `SELECT * FROM fee_receipt_sequences ${where} ORDER BY academic_year DESC, is_default DESC, name`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing fee series:', error);
    return NextResponse.json({ success: false, error: 'Failed to list receipt series' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const academicYear = String(body.academic_year || '').trim();
    const name = String(body.name || '').trim();
    const prefix = String(body.prefix || RECEIPT_PREFIX).trim().toUpperCase();
    const isDefault = Boolean(body.is_default);

    if (!academicYear || !name || !prefix) {
      return NextResponse.json({ success: false, error: 'Name, prefix, and academic year are required' }, { status: 400 });
    }

    const yearName = parseAcademicYear(academicYear).name;
    if (isDefault) {
      await auth.db.query(
        `UPDATE fee_receipt_sequences SET is_default = false WHERE academic_year = $1`,
        [yearName]
      );
    }

    const existingDefault = await auth.db.query(
      `SELECT 1 FROM fee_receipt_sequences WHERE academic_year = $1 AND is_default = true`,
      [yearName]
    );

    const result = await auth.db.query(
      `INSERT INTO fee_receipt_sequences (academic_year, last_number, name, prefix, is_default, is_active)
       VALUES ($1, 0, $2, $3, $4, true)
       RETURNING *`,
      [yearName, name, prefix, isDefault || existingDefault.rows.length === 0]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee series:', error);
    const message = error instanceof Error && error.message.includes('idx_fee_receipt_sequences_year_prefix')
      ? 'A series with this prefix already exists for the academic year'
      : 'Failed to create receipt series';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
