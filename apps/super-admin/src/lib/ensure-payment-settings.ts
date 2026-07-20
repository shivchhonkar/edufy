import type { RequestDb } from '@/lib/request-db';

export type RazorpayPaymentSettings = {
  enabled?: boolean;
  key_id?: string | null;
  key_secret?: string | null;
};

export type PaymentSettings = {
  razorpay?: RazorpayPaymentSettings;
};

const MIGRATION_SQL = `
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS fee_payment_orders (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year VARCHAR(50) NOT NULL,
  fee_ids JSONB NOT NULL,
  amount_paise INTEGER NOT NULL,
  amount_rupees DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  razorpay_order_id VARCHAR(100) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',
  payer_name VARCHAR(255),
  payer_email VARCHAR(255),
  payer_phone VARCHAR(30),
  transaction_id VARCHAR(100),
  receipt_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fee_payment_orders_student ON fee_payment_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payment_orders_status ON fee_payment_orders(status);
`;

export async function ensurePaymentSettings(db: RequestDb): Promise<void> {
  await db.query(MIGRATION_SQL);
}

export function parsePaymentSettings(raw: unknown): PaymentSettings {
  if (!raw || typeof raw !== 'object') return {};
  const value = raw as PaymentSettings;
  return {
    razorpay: value.razorpay ?? {},
  };
}
