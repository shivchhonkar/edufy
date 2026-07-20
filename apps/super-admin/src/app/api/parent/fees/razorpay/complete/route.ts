import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { getParentSession, parentCanAccessStudent } from '@/lib/parent-auth';
import { applyOnlineFeePayment } from '@/lib/parent-portal/fee-online-payment';
import { loadRazorpayCredentials, verifyRazorpayPaymentSignature } from '@/lib/razorpay-client';
import { ensurePaymentSettings } from '@/lib/ensure-payment-settings';

function parseFeeIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw
      .map((value) => parseInt(String(value), 10))
      .filter((value) => Number.isFinite(value) && value > 0);
  }
  if (typeof raw === 'string') {
    try {
      return parseFeeIds(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
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
    const paymentId = String(body?.razorpay_payment_id ?? '').trim();
    const orderId = String(body?.razorpay_order_id ?? '').trim();
    const signature = String(body?.razorpay_signature ?? '').trim();
    const payerName = String(body?.payerName ?? '').trim();

    if (!Number.isFinite(studentId) || studentId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }
    if (!parentCanAccessStudent(session, studentId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    if (!paymentId || !orderId || !signature) {
      return NextResponse.json({ success: false, error: 'Incomplete payment response' }, { status: 400 });
    }

    await ensurePaymentSettings(db);
    const credentials = await loadRazorpayCredentials(db);
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: 'Online payment is not configured' },
        { status: 503 },
      );
    }

    const isValid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
      keySecret: credentials.keySecret,
    });
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 });
    }

    const pendingOrderResult = await db.query(
      `SELECT id, student_id, academic_year, fee_ids, amount_paise, status
       FROM fee_payment_orders
       WHERE razorpay_order_id = $1
       LIMIT 1`,
      [orderId],
    );

    const pendingOrder = pendingOrderResult.rows[0];
    if (!pendingOrder) {
      return NextResponse.json({ success: false, error: 'Payment order not found' }, { status: 404 });
    }
    if (pendingOrder.status === 'paid') {
      return NextResponse.json({
        success: true,
        data: {
          alreadyProcessed: true,
          transactionId: paymentId,
        },
      });
    }
    if (pendingOrder.student_id !== studentId) {
      return NextResponse.json({ success: false, error: 'Student mismatch for payment order' }, { status: 400 });
    }

    const orderFeeIds = parseFeeIds(pendingOrder.fee_ids);
    const resolvedFeeIds = feeIds.length ? feeIds : orderFeeIds;
    const resolvedYear = academicYear || String(pendingOrder.academic_year || '');

    const paymentResult = await applyOnlineFeePayment(db, {
      studentId,
      academicYear: resolvedYear,
      feeIds: resolvedFeeIds,
      transactionId: paymentId,
      payerName: payerName || session.login || 'Parent Portal',
      remarks: `Razorpay online payment (${orderId})`,
    });

    await db.query(
      `UPDATE fee_payment_orders
       SET status = 'paid',
           transaction_id = $1,
           receipt_number = $2,
           paid_at = NOW(),
           payer_name = COALESCE(NULLIF($3, ''), payer_name)
       WHERE razorpay_order_id = $4`,
      [paymentId, paymentResult.receiptNumber, payerName, orderId],
    );

    return NextResponse.json({
      success: true,
      data: {
        receiptNumber: paymentResult.receiptNumber,
        totalAmount: paymentResult.totalAmount,
        transactionId: paymentId,
        feeCount: paymentResult.feeCount,
      },
    });
  } catch (error) {
    console.error('Error completing fee Razorpay payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete payment',
      },
      { status: 500 },
    );
  }
}
