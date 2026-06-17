import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureGatePassSchema } from '@/lib/ensure-gate-pass-schema';
import { verifyGatePassOtp } from '@/lib/two-factor-otp';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureGatePassSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const otp = String(body.otp || '').trim();

    const passResult = await db.query<{
      status: string;
      otp_session_id: string | null;
    }>('SELECT status, otp_session_id FROM student_gate_passes WHERE id = $1', [id]);

    const pass = passResult.rows[0];
    if (!pass) {
      return NextResponse.json({ success: false, error: 'Gate pass not found' }, { status: 404 });
    }
    if (pass.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Gate pass is no longer pending' },
        { status: 400 }
      );
    }
    if (!pass.otp_session_id) {
      return NextResponse.json(
        { success: false, error: 'OTP has not been sent yet' },
        { status: 400 }
      );
    }
    if (!otp) {
      return NextResponse.json({ success: false, error: 'OTP is required' }, { status: 400 });
    }

    const verifyResult = await verifyGatePassOtp(pass.otp_session_id, otp);
    if (!verifyResult.success) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'Invalid OTP' },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateResult = await db.query(
      `UPDATE student_gate_passes
       SET status = 'approved',
           approval_method = 'parent_otp',
           otp_verified_at = $1,
           approved_at = $1,
           exit_at = $1
       WHERE id = $2
       RETURNING *`,
      [now, id]
    );

    return NextResponse.json({ success: true, data: updateResult.rows[0] });
  } catch (error) {
    console.error('Error verifying gate pass OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
