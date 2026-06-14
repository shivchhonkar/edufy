import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const campaignId = parseInt(params.id, 10);
    if (!Number.isFinite(campaignId)) {
      return NextResponse.json({ success: false, error: 'Invalid campaign id' }, { status: 400 });
    }

    const campaign = await db.query(
      `SELECT c.*, cl.name AS class_name, sec.name AS section_name
       FROM sms_campaigns c
       LEFT JOIN classes cl ON c.class_id = cl.id
       LEFT JOIN sections sec ON c.section_id = sec.id
       WHERE c.id = $1`,
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const logs = await db.query(
      `SELECT id, recipient_phone, recipient_name, student_id, message,
              status, error_message, sent_at, created_at
       FROM sms_message_logs
       WHERE campaign_id = $1
       ORDER BY id ASC`,
      [campaignId]
    );

    return NextResponse.json({
      success: true,
      data: {
        campaign: campaign.rows[0],
        logs: logs.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}
