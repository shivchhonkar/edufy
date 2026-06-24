import type { RequestDb } from '@/lib/request-db';

export function parseStaffId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function phoneLast10(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export async function staffExists(db: RequestDb, staffId: number): Promise<boolean> {
  const result = await db.query('SELECT id FROM staff WHERE id = $1', [staffId]);
  return result.rows.length > 0;
}

export async function getStaffPhoneKey(
  db: RequestDb,
  staffId: number,
): Promise<{ phone: string | null; phoneKey: string | null; name: string } | null> {
  const result = await db.query<{ phone: string | null; first_name: string; last_name: string }>(
    'SELECT phone, first_name, last_name FROM staff WHERE id = $1',
    [staffId],
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    phone: row.phone,
    phoneKey: phoneLast10(row.phone),
    name: `${row.first_name} ${row.last_name}`.trim(),
  };
}
