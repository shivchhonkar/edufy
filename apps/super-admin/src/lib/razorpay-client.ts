import crypto from 'crypto';
import type { RequestDb } from '@/lib/request-db';
import {
  ensurePaymentSettings,
  parsePaymentSettings,
  type PaymentSettings,
} from '@/lib/ensure-payment-settings';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';

export type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
  enabled: boolean;
  source: 'database' | 'environment';
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
};

export async function loadRazorpayCredentials(db: RequestDb): Promise<RazorpayCredentials | null> {
  await ensureSystemSettings(db);
  await ensurePaymentSettings(db);

  const settingsResult = await db.query(
    `SELECT payment_settings FROM system_settings ORDER BY id DESC LIMIT 1`,
  );
  const paymentSettings = parsePaymentSettings(settingsResult.rows[0]?.payment_settings);

  const dbKeyId = paymentSettings.razorpay?.key_id?.trim();
  const dbKeySecret = paymentSettings.razorpay?.key_secret?.trim();
  const dbEnabled = paymentSettings.razorpay?.enabled !== false;

  if (dbKeyId && dbKeySecret && dbEnabled) {
    return {
      keyId: dbKeyId,
      keySecret: dbKeySecret,
      enabled: true,
      source: 'database',
    };
  }

  const envKeyId = process.env.RAZORPAY_KEY_ID?.trim();
  const envKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (envKeyId && envKeySecret) {
    return {
      keyId: envKeyId,
      keySecret: envKeySecret,
      enabled: true,
      source: 'environment',
    };
  }

  return null;
}

export async function savePaymentSettings(
  db: RequestDb,
  nextSettings: PaymentSettings,
): Promise<PaymentSettings> {
  await ensurePaymentSettings(db);

  const existing = await db.query(
    `SELECT id, payment_settings FROM system_settings ORDER BY id DESC LIMIT 1`,
  );

  const current = parsePaymentSettings(existing.rows[0]?.payment_settings);
  const merged: PaymentSettings = {
    razorpay: {
      ...current.razorpay,
      ...nextSettings.razorpay,
    },
  };

  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO system_settings (school_name, payment_settings, created_at, updated_at)
       VALUES ('School', $1::jsonb, NOW(), NOW())`,
      [JSON.stringify(merged)],
    );
  } else {
    await db.query(
      `UPDATE system_settings
       SET payment_settings = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(merged), existing.rows[0].id],
    );
  }

  return merged;
}

export async function createRazorpayOrder(params: {
  keyId: string;
  keySecret: string;
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  const auth = Buffer.from(`${params.keyId}:${params.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to create Razorpay order');
  }

  return (await response.json()) as RazorpayOrderResponse;
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = crypto
    .createHmac('sha256', params.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');
  return expected === params.signature;
}
