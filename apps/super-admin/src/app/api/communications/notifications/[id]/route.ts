import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureCommunicationsSchema } from '@/lib/ensure-communications-schema';
import { isValidAudienceType } from '@/lib/sms-recipients';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const existing = await db.query(
      `SELECT id FROM school_notifications WHERE id = $1`,
      [parseInt(id, 10)]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      message,
      audience_type,
      class_id,
      section_id,
      priority,
      category,
      scheduled_at,
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
      `UPDATE school_notifications SET
        title = COALESCE($2, title),
        message = COALESCE($3, message),
        audience_type = COALESCE($4, audience_type),
        class_id = $5,
        section_id = $6,
        priority = COALESCE($7, priority),
        category = COALESCE($8, category),
        scheduled_at = $9,
        expires_at = $10,
        send_sms = COALESCE($11, send_sms),
        status = COALESCE($12, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [
        parseInt(id, 10),
        title?.trim() || null,
        message?.trim() || null,
        audience_type || null,
        class_id ?? null,
        section_id ?? null,
        priority || null,
        category || null,
        scheduled_at ?? null,
        expires_at ?? null,
        send_sms !== undefined ? Boolean(send_sms) : null,
        status || null,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Notification PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
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
      `DELETE FROM school_notifications WHERE id = $1 RETURNING id`,
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
