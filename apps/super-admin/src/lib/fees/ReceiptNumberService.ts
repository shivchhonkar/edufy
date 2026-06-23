import type { RequestDb } from '@/lib/request-db';
import { parseAcademicYear } from '@/lib/fees/AcademicYear';
import { RECEIPT_PREFIX } from '@/lib/fees/constants';

/**
 * School-scoped sequential receipt numbers: RCP-2026-000001
 */
export async function generateNextReceiptNumber(
  db: RequestDb,
  academicYear: string
): Promise<string> {
  const parsed = parseAcademicYear(academicYear);
  const yearLabel = String(parsed.startYear);

  const result = await db.query<{ last_number: number }>(
    `INSERT INTO fee_receipt_sequences (academic_year, last_number)
     VALUES ($1, 1)
     ON CONFLICT (academic_year)
     DO UPDATE SET last_number = fee_receipt_sequences.last_number + 1, updated_at = NOW()
     RETURNING last_number`,
    [parsed.name]
  );

  const seq = result.rows[0]?.last_number ?? 1;
  return `${RECEIPT_PREFIX}-${yearLabel}-${String(seq).padStart(6, '0')}`;
}

export const ReceiptNumberService = {
  generateNext: generateNextReceiptNumber,
};
