import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureGatePassSchema } from '@/lib/ensure-gate-pass-schema';
import { sendGatePassOtp } from '@/lib/two-factor-otp';
import { isTwoFactorConfigured } from '@/lib/two-factor-sms';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureGatePassSchema(db);

    if (!isTwoFactorConfigured()) {
      return NextResponse.json(
        { success: false, error: 'OTP is not configured. Set OTP_API_KEY in environment.' },
        { status: 503 }
      );
    }

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const guardianMobile = String(body.guardian_mobile || '').trim();
    if (!guardianMobile) {
      return NextResponse.json(
        { success: false, error: 'guardian_mobile is required' },
        { status: 400 }
      );
    }

    const existing = await db.query<{ status: string }>(
      'SELECT status FROM student_gate_passes WHERE id = $1',
      [id]
    );
    if (!existing.rows[0]) {
      return NextResponse.json({ success: false, error: 'Gate pass not found' }, { status: 404 });
    }
    if (existing.rows[0].status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Gate pass is no longer pending' },
        { status: 400 }
      );
    }

    const otpResult = await sendGatePassOtp(guardianMobile);
    if (!otpResult.success || !otpResult.sessionId) {
      return NextResponse.json(
        { success: false, error: otpResult.error || 'Failed to send OTP' },
        { status: 502 }
      );
    }

    await db.query(
      `UPDATE student_gate_passes
       SET otp_session_id = $1, otp_sent_to_mobile = $2
       WHERE id = $3`,
      [otpResult.sessionId, otpResult.phone, id]
    );

    return NextResponse.json({
      success: true,
      data: {
        message: `OTP sent to guardian mobile ending ${otpResult.phone.slice(-4)}`,
        masked_mobile: `******${otpResult.phone.slice(-4)}`,
      },
    });
  } catch (error) {
    console.error('Error sending gate pass OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
