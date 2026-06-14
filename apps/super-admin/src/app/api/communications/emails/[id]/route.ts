import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureCommunicationsSchema } from '@/lib/ensure-communications-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const campaign = await db.query(
      `SELECT ec.*, c.name AS class_name, sec.name AS section_name
       FROM email_campaigns ec
       LEFT JOIN classes c ON ec.class_id = c.id
       LEFT JOIN sections sec ON ec.section_id = sec.id
       WHERE ec.id = $1`,
      [parseInt(id, 10)]
    );

    if (campaign.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Email campaign not found' },
        { status: 404 }
      );
    }

    const logs = await db.query(
      `SELECT * FROM email_message_logs
       WHERE campaign_id = $1
       ORDER BY created_at DESC`,
      [parseInt(id, 10)]
    );

    return NextResponse.json({
      success: true,
      data: { ...campaign.rows[0], logs: logs.rows },
    });
  } catch (error) {
    console.error('Email campaign GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email campaign' },
      { status: 500 }
    );
  }
}
