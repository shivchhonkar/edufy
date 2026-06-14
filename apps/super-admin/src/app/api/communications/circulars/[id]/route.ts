import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureCommunicationsSchema } from '@/lib/ensure-communications-schema';
import { isValidAudienceType } from '@/lib/sms-recipients';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const result = await db.query(
      `SELECT sc.*, c.name AS class_name, sec.name AS section_name
       FROM school_circulars sc
       LEFT JOIN classes c ON sc.class_id = c.id
       LEFT JOIN sections sec ON sc.section_id = sec.id
       WHERE sc.id = $1`,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Circular not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Circular GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch circular' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const existing = await db.query(
      `SELECT id, status FROM school_circulars WHERE id = $1`,
      [parseInt(id, 10)]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Circular not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      content,
      circular_number,
      audience_type,
      class_id,
      section_id,
      priority,
      effective_date,
      expires_at,
      send_sms,
      status,
    } = body;

    if (audience_type && !isValidAudienceType(audience_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audience_type' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE school_circulars SET
        title = COALESCE($2, title),
        content = COALESCE($3, content),
        circular_number = COALESCE($4, circular_number),
        audience_type = COALESCE($5, audience_type),
        class_id = $6,
        section_id = $7,
        priority = COALESCE($8, priority),
        effective_date = $9,
        expires_at = $10,
        send_sms = COALESCE($11, send_sms),
        status = COALESCE($12, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [
        parseInt(id, 10),
        title?.trim() || null,
        content?.trim() || null,
        circular_number?.trim() ?? null,
        audience_type || null,
        class_id ?? null,
        section_id ?? null,
        priority || null,
        effective_date ?? null,
        expires_at ?? null,
        send_sms !== undefined ? Boolean(send_sms) : null,
        status || null,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Circular PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update circular' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const result = await db.query(
      `DELETE FROM school_circulars WHERE id = $1 RETURNING id`,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Circular not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Circular DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete circular' },
      { status: 500 }
    );
  }
}
