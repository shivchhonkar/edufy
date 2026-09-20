import type { RequestDb } from '@/lib/request-db';
import { parseAcademicYear } from '@/lib/fees/AcademicYear';
import { RECEIPT_PREFIX } from '@/lib/fees/constants';

/**
 * School-scoped sequential receipt numbers: {PREFIX}-{year}-{000001}
 */
export async function generateNextReceiptNumber(
  db: RequestDb,
  academicYear: string,
  prefix?: string
): Promise<string> {
  const parsed = parseAcademicYear(academicYear);
  const yearLabel = String(parsed.startYear);

  let usePrefix = prefix?.trim().toUpperCase() || '';
  if (!usePrefix) {
    const existing = await db.query<{ prefix: string }>(
      `SELECT prefix FROM fee_receipt_sequences
       WHERE academic_year = $1 AND COALESCE(is_active, true) = true
       ORDER BY COALESCE(is_default, false) DESC, id ASC
       LIMIT 1`,
      [parsed.name]
    );
    usePrefix = existing.rows[0]?.prefix || RECEIPT_PREFIX;
  }

  const result = await db.query<{ last_number: number; prefix: string }>(
    `INSERT INTO fee_receipt_sequences (academic_year, last_number, prefix, name, is_default, is_active)
     VALUES ($1, 1, $2, $2, false, true)
     ON CONFLICT (academic_year, prefix)
     DO UPDATE SET last_number = fee_receipt_sequences.last_number + 1, updated_at = NOW()
     RETURNING last_number, prefix`,
    [parsed.name, usePrefix]
  );

  const seq = result.rows[0]?.last_number ?? 1;
  const used = result.rows[0]?.prefix || usePrefix;
  return `${used}-${yearLabel}-${String(seq).padStart(6, '0')}`;
}

export const ReceiptNumberService = {
  generateNext: generateNextReceiptNumber,
};
