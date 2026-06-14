import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureCommunicationsSchema } from '@/lib/ensure-communications-schema';
import {
  isValidAudienceType,
  resolveEmailRecipients,
  type EmailRecipient,
} from '@/lib/email-recipients';
import {
  getEmailConfigStatus,
  isEmailReady,
  sendEmail,
  textToHtml,
} from '@/lib/email-sender';

const LIST_QUERY = `
  SELECT ec.*,
    c.name AS class_name,
    sec.name AS section_name
  FROM email_campaigns ec
  LEFT JOIN classes c ON ec.class_id = c.id
  LEFT JOIN sections sec ON ec.section_id = sec.id
  ORDER BY ec.created_at DESC
`;

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const result = await db.query(LIST_QUERY);
    return NextResponse.json({
      success: true,
      data: result.rows,
      config: getEmailConfigStatus(),
    });
  } catch (error) {
    console.error('Email campaigns GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email campaigns' },
      { status: 500 }
    );
  }
}

interface SendEmailBody {
  title: string;
  subject: string;
  body_text: string;
  audience_type: string;
  class_id?: number | null;
  section_id?: number | null;
  selected_recipients?: EmailRecipient[];
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureCommunicationsSchema(db);

    const body = (await request.json()) as SendEmailBody;
    const {
      title,
      subject,
      body_text,
      audience_type,
      class_id = null,
      section_id = null,
      selected_recipients,
    } = body;

    if (!title?.trim() || !subject?.trim() || !body_text?.trim()) {
      return NextResponse.json(
        { success: false, error: 'title, subject, and body_text are required' },
        { status: 400 }
      );
    }

    if (!isValidAudienceType(audience_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audience_type' },
        { status: 400 }
      );
    }

    let recipients: EmailRecipient[];
    if (selected_recipients && selected_recipients.length > 0) {
      recipients = selected_recipients.filter((r) => r.email?.trim());
    } else {
      recipients = await resolveEmailRecipients(db, audience_type, class_id, section_id);
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No email recipients for this audience' },
        { status: 400 }
      );
    }

    const emailReady = isEmailReady();
    const bodyHtml = textToHtml(body_text.trim());

    const campaignResult = await db.query<{ id: number }>(
      `INSERT INTO email_campaigns (
        title, subject, body_html, body_text, audience_type, class_id, section_id,
        total_recipients, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id`,
      [
        title.trim(),
        subject.trim(),
        bodyHtml,
        body_text.trim(),
        audience_type,
        class_id,
        section_id,
        recipients.length,
        emailReady ? 'sending' : 'queued',
      ]
    );

    const campaignId = campaignResult.rows[0].id;
    let sentCount = 0;
    let failedCount = 0;
    let queuedCount = 0;

    for (const recipient of recipients) {
      let status: 'sent' | 'failed' | 'queued' = 'queued';
      let errorMessage: string | null = null;
      let sentAt: Date | null = null;

      if (emailReady) {
        const result = await sendEmail({
          to: recipient.email,
          subject: subject.trim(),
          text: body_text.trim(),
          html: bodyHtml,
        });

        if (result.success) {
          status = 'sent';
          sentCount += 1;
          sentAt = new Date();
        } else if (result.queued) {
          status = 'queued';
          queuedCount += 1;
          errorMessage = result.error || null;
        } else {
          status = 'failed';
          failedCount += 1;
          errorMessage = result.error || null;
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      } else {
        queuedCount += 1;
        errorMessage = 'Email provider not configured — campaign saved for later delivery';
      }

      await db.query(
        `INSERT INTO email_message_logs (
          campaign_id, recipient_email, recipient_name, student_id,
          status, error_message, sent_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          campaignId,
          recipient.email,
          recipient.name,
          recipient.student_id || null,
          status,
          errorMessage,
          sentAt,
        ]
      );
    }

    const finalStatus = emailReady
      ? failedCount === recipients.length
        ? 'failed'
        : 'completed'
      : 'queued';

    await db.query(
      `UPDATE email_campaigns
       SET sent_count = $2, failed_count = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [campaignId, sentCount, failedCount, finalStatus]
    );

    return NextResponse.json({
      success: sentCount > 0 || queuedCount > 0,
      data: {
        campaign_id: campaignId,
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        queued: queuedCount,
        email_ready: emailReady,
      },
      message: emailReady
        ? failedCount === 0
          ? `Email sent to ${sentCount} recipient(s)`
          : `Sent ${sentCount}, failed ${failedCount}`
        : `Campaign saved — ${queuedCount} recipient(s) queued. Configure RESEND_API_KEY and SMTP_FROM to send emails.`,
    });
  } catch (error) {
    console.error('Email campaign POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email campaign' },
      { status: 500 }
    );
  }
}
