import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureGatePassSchema } from '@/lib/ensure-gate-pass-schema';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureGatePassSchema(db);

    const studentId = parseInt(
      new URL(request.url).searchParams.get('student_id') || '',
      10
    );
    if (!studentId || Number.isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 });
    }

    const guardians = await db.query<{
      relation_type: string;
      name: string;
      mobile: string | null;
      alternate_mobile: string | null;
      is_primary_contact: boolean;
    }>(
      `SELECT relation_type, name, mobile, alternate_mobile, is_primary_contact
       FROM student_guardians
       WHERE student_id = $1
       ORDER BY is_primary_contact DESC, id ASC`,
      [studentId]
    );

    const contacts: Array<{
      label: string;
      name: string;
      mobile: string;
      source: string;
    }> = [];

    for (const g of guardians.rows) {
      for (const mobile of [g.mobile, g.alternate_mobile]) {
        if (!mobile?.trim()) continue;
        const digits = mobile.replace(/\D/g, '');
        if (digits.length < 10) continue;
        contacts.push({
          label: `${g.name} (${g.relation_type})`,
          name: g.name,
          mobile: mobile.trim(),
          source: 'guardian',
        });
      }
    }

    const studentResult = await db.query<{
      parent_name: string | null;
      parent_phone: string | null;
    }>('SELECT parent_name, parent_phone FROM students WHERE id = $1', [studentId]);

    const parent = studentResult.rows[0];
    if (parent?.parent_phone?.trim()) {
      const exists = contacts.some(
        (c) => c.mobile.replace(/\D/g, '') === parent.parent_phone!.replace(/\D/g, '')
      );
      if (!exists) {
        contacts.push({
          label: `${parent.parent_name || 'Parent'} (registered)`,
          name: parent.parent_name || 'Parent',
          mobile: parent.parent_phone.trim(),
          source: 'parent',
        });
      }
    }

    const unique = new Map<string, (typeof contacts)[0]>();
    for (const c of contacts) {
      const key = c.mobile.replace(/\D/g, '').slice(-10);
      if (!unique.has(key)) unique.set(key, c);
    }

    return NextResponse.json({
      success: true,
      data: Array.from(unique.values()),
    });
  } catch (error) {
    console.error('Error fetching guardian contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guardian contacts' },
      { status: 500 }
    );
  }
}
