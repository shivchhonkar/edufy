import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { getParentSession, parentCanAccessStudent } from '@/lib/parent-auth';
import {
  calculatePayableTotal,
  loadParentPayerDetails,
  loadStudentFeesForPayment,
} from '@/lib/parent-portal/fee-online-payment';
import { createRazorpayOrder, loadRazorpayCredentials } from '@/lib/razorpay-client';
import { ensurePaymentSettings } from '@/lib/ensure-payment-settings';

function parseFeeIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => parseInt(String(value), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export async function POST(request: NextRequest) {
  try {
    const session = getParentSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const body = await request.json();
    const studentId = parseInt(String(body?.studentId ?? ''), 10);
    const academicYear = String(body?.academicYear ?? '').trim();
    const feeIds = parseFeeIds(body?.feeIds);
    const payerName = String(body?.payerName ?? '').trim();
    const payerEmail = String(body?.payerEmail ?? '').trim();
    const payerPhone = String(body?.payerPhone ?? '').trim();

    if (!Number.isFinite(studentId) || studentId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }
    if (!parentCanAccessStudent(session, studentId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    if (!academicYear) {
      return NextResponse.json({ success: false, error: 'Academic year is required' }, { status: 400 });
    }
    if (!feeIds.length) {
      return NextResponse.json({ success: false, error: 'Select at least one fee installment' }, { status: 400 });
    }

    await ensurePaymentSettings(db);
    const credentials = await loadRazorpayCredentials(db);
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: 'Online payment is not configured. Contact the school office.' },
        { status: 503 },
      );
    }

    const fees = await loadStudentFeesForPayment(db, studentId, feeIds, academicYear);
    if (fees.length !== feeIds.length) {
      return NextResponse.json({ success: false, error: 'Invalid fee selection' }, { status: 400 });
    }

    const totalRupees = calculatePayableTotal(fees);
    if (totalRupees <= 0) {
      return NextResponse.json({ success: false, error: 'Selected fees are already paid' }, { status: 400 });
    }

    const amountPaise = Math.round(totalRupees * 100);
    const payer = await loadParentPayerDetails(db, studentId);
    const receipt = `fee-${studentId}-${Date.now()}`;

    const order = await createRazorpayOrder({
      keyId: credentials.keyId,
      keySecret: credentials.keySecret,
      amountPaise,
      receipt,
      notes: {
        student_id: String(studentId),
        academic_year: academicYear,
        fee_ids: feeIds.join(','),
      },
    });

    await db.query(
      `INSERT INTO fee_payment_orders (
         student_id, academic_year, fee_ids, amount_paise, amount_rupees,
         currency, razorpay_order_id, status, payer_name, payer_email, payer_phone
       ) VALUES ($1, $2, $3::jsonb, $4, $5, 'INR', $6, 'pending', $7, $8, $9)`,
      [
        studentId,
        academicYear,
        JSON.stringify(feeIds),
        amountPaise,
        totalRupees,
        order.id,
        payerName || payer.name,
        payerEmail || payer.email,
        payerPhone || payer.phone,
      ],
    );

    return NextResponse.json({
      success: true,
      data: {
        keyId: credentials.keyId,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
        payer: {
          name: payerName || payer.name,
          email: payerEmail || payer.email,
          phone: payerPhone || payer.phone,
        },
        schoolName: payer.schoolName,
        amountRupees: totalRupees,
        studentId,
        academicYear,
        feeIds,
      },
    });
  } catch (error) {
    console.error('Error creating fee Razorpay order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment order',
      },
      { status: 500 },
    );
  }
}
