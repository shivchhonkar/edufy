import { NextRequest, NextResponse } from 'next/server';
import { csvToObjects } from '@/lib/csv-import';
import { allocateToOldestDues, requireFeeOps } from '@/lib/fee-operations-utils';
import { generateNextReceiptNumber } from '@/lib/fees/ReceiptNumberService';

type ImportRow = {
  admission_number: string;
  amount: string;
  payment_date?: string;
  payment_method?: string;
  remarks?: string;
  discount?: string;
  academic_year?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const csv = String(body.csv || body.text || '');
    const defaultYear = String(body.academic_year || '').trim();
    const parsed = csvToObjects<ImportRow>(csv, ['admission_number', 'amount']);
    if (parsed.errors.length) {
      return NextResponse.json({ success: false, error: parsed.errors.join('; ') }, { status: 400 });
    }

    const results: Array<{ admission_number: string; ok: boolean; error?: string; receipt_number?: string }> = [];

    for (const row of parsed.rows) {
      const admission = String(row.admission_number || '').trim();
      const amount = parseFloat(String(row.amount || 0));
      if (!admission || !amount || amount <= 0) {
        results.push({ admission_number: admission, ok: false, error: 'Invalid admission number or amount' });
        continue;
      }

      const student = await auth.db.query<{ id: number }>(
        `SELECT id FROM students WHERE admission_number = $1 LIMIT 1`,
        [admission]
      );
      if (!student.rows[0]) {
        results.push({ admission_number: admission, ok: false, error: 'Student not found' });
        continue;
      }

      const academicYear = String(row.academic_year || defaultYear).trim();
      if (!academicYear) {
        results.push({ admission_number: admission, ok: false, error: 'Academic year is required' });
        continue;
      }

      const paymentDate = String(row.payment_date || new Date().toISOString().slice(0, 10));
      const method = String(row.payment_method || 'cash').toLowerCase();
      const allowed = ['cash', 'online', 'cheque', 'card', 'upi', 'bank'];
      const paymentMethod = allowed.includes(method) ? method : 'cash';

      try {
        const receiptNumber = await generateNextReceiptNumber(auth.db, academicYear);
        const allocated = await allocateToOldestDues(auth.db, student.rows[0].id, academicYear, amount);
        await auth.db.query(
          `INSERT INTO fee_payments (
             student_id, amount_paid, payment_date, payment_method, receipt_number,
             status, remarks, created_by, discount_applied, academic_year,
             is_misc, allocated_fee_ids, payment_source
           ) VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8, $9, true, $10, 'import')`,
          [
            student.rows[0].id,
            amount,
            paymentDate,
            paymentMethod,
            receiptNumber,
            row.remarks || 'Imported fee receipt',
            auth.user.id,
            parseFloat(String(row.discount || 0)) || 0,
            academicYear,
            allocated,
          ]
        );
        results.push({ admission_number: admission, ok: true, receipt_number: receiptNumber });
      } catch (error) {
        results.push({
          admission_number: admission,
          ok: false,
          error: error instanceof Error ? error.message : 'Import failed',
        });
      }
    }

    const imported = results.filter((row) => row.ok).length;
    return NextResponse.json({
      success: true,
      data: { imported, failed: results.length - imported, results },
      message: `Imported ${imported} of ${results.length} rows`,
    });
  } catch (error) {
    console.error('Error importing fees:', error);
    return NextResponse.json({ success: false, error: 'Failed to import fee receipts' }, { status: 500 });
  }
}
