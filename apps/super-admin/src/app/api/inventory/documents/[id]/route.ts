import { NextRequest, NextResponse } from 'next/server';
import { postDocument, requireInventory, writeAudit } from '@/lib/inventory-utils';
import type { RequestDb } from '@/lib/request-db';

async function loadDocument(db: RequestDb, id: number) {
  const docRes = await db.query(
    `SELECT d.*,
            v.name AS vendor_name,
            loc.name AS location_name,
            tloc.name AS to_location_name
     FROM inventory_docs d
     LEFT JOIN inventory_vendors v ON v.id = d.vendor_id
     LEFT JOIN inventory_locations loc ON loc.id = d.location_id
     LEFT JOIN inventory_locations tloc ON tloc.id = d.to_location_id
     WHERE d.id = $1`,
    [id]
  );
  const doc = docRes.rows[0];
  if (!doc) return null;

  const linesRes = await db.query(
    `SELECT l.*, i.item_name, i.item_code, i.unit, i.size
     FROM inventory_doc_lines l
     JOIN inventory_items i ON i.id = l.item_id
     WHERE l.doc_id = $1
     ORDER BY l.id`,
    [id]
  );

  let party: Record<string, unknown> | null = null;
  if (doc.party_type === 'student' && doc.party_id) {
    try {
      const studentRes = await db.query(
        `SELECT s.first_name, s.last_name, s.admission_number, s.address, s.city, s.state,
                s.parent_name, s.parent_phone, s.mother_name,
                c.name AS class_name, sec.name AS section_name
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN sections sec ON sec.id = s.section_id
         WHERE s.id = $1
         LIMIT 1`,
        [doc.party_id]
      );
      party = studentRes.rows[0] || null;
    } catch {
      party = null;
    }
  }

  return { ...doc, lines: linesRes.rows, party };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const id = Number(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid document id' }, { status: 400 });
    const doc = await loadDocument(auth.db, id);
    if (!doc) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load document' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const id = Number(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid document id' }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').toLowerCase();

    if (!['post', 'approve', 'cancel'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
    }

    const result = await auth.db.transaction(async (client) => {
      const existing = await client.query(`SELECT * FROM inventory_docs WHERE id = $1 FOR UPDATE`, [id]);
      const doc = existing.rows[0];
      if (!doc) throw new Error('Document not found');

      if (action === 'cancel') {
        if (doc.status === 'posted') throw new Error('Posted documents cannot be cancelled');
        if (doc.status === 'cancelled') throw new Error('Already cancelled');
        const updated = await client.query(
          `UPDATE inventory_docs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
          [id]
        );
        return updated.rows[0];
      }

      if (action === 'approve') {
        if (doc.status === 'posted') throw new Error('Already posted');
        if (doc.status === 'cancelled') throw new Error('Cancelled documents cannot be approved');
        const updated = await client.query(
          `UPDATE inventory_docs SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
          [id]
        );
        return updated.rows[0];
      }

      await postDocument(client, id, auth.user.id);
      const posted = await client.query(`SELECT * FROM inventory_docs WHERE id = $1`, [id]);
      return posted.rows[0];
    });

    await writeAudit(auth.db, auth.user, action, 'document', id, { doc_no: result.doc_no, status: result.status });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Action failed';
    const status = message === 'Document not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
