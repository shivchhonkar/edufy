import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireAuth } from '@/lib/api-auth';
import { savePaymentSettings, loadRazorpayCredentials } from '@/lib/razorpay-client';
import { ensurePaymentSettings } from '@/lib/ensure-payment-settings';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensurePaymentSettings(db);
    const settingsResult = await db.query(
      `SELECT payment_settings FROM system_settings ORDER BY id DESC LIMIT 1`,
    );
    const paymentSettings = settingsResult.rows[0]?.payment_settings ?? {};
    const razorpay = paymentSettings?.razorpay ?? {};

    return NextResponse.json({
      success: true,
      data: {
        razorpay: {
          enabled: razorpay.enabled !== false,
          key_id: razorpay.key_id || '',
          has_secret: Boolean(String(razorpay.key_secret || '').trim()),
        },
      },
    });
  } catch (error) {
    console.error('Error loading payment settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load payment settings' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const body = await request.json();
    const enabled = body?.razorpay?.enabled !== false;
    const keyId = String(body?.razorpay?.key_id ?? '').trim();
    const keySecret = String(body?.razorpay?.key_secret ?? '').trim();

    const existing = await db.query(
      `SELECT payment_settings FROM system_settings ORDER BY id DESC LIMIT 1`,
    );
    const currentSecret = existing.rows[0]?.payment_settings?.razorpay?.key_secret ?? '';

    const saved = await savePaymentSettings(db, {
      razorpay: {
        enabled,
        key_id: keyId || null,
        key_secret: keySecret || currentSecret || null,
      },
    });

    const credentials = await loadRazorpayCredentials(db);

    return NextResponse.json({
      success: true,
      data: {
        razorpay: {
          enabled: saved.razorpay?.enabled !== false,
          key_id: saved.razorpay?.key_id || '',
          has_secret: Boolean(credentials?.keySecret),
          configured: Boolean(credentials),
        },
      },
    });
  } catch (error) {
    console.error('Error saving payment settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save payment settings' },
      { status: 500 },
    );
  }
}
