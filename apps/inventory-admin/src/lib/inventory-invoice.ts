import { query } from '@edulakhya/database'

export async function ensureInventoryInvoiceTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS inventory_invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      student_id INTEGER,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
      remarks TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  await query(
    `CREATE TABLE IF NOT EXISTS inventory_invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES inventory_invoices(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0
    )`,
  )
}

export async function generateInventoryInvoiceNumber() {
  const prefix = `INV-${new Date().getFullYear()}`
  const latest = await query<{ invoice_number: string }>(
    `SELECT invoice_number
     FROM inventory_invoices
     WHERE invoice_number LIKE $1
     ORDER BY id DESC
     LIMIT 1`,
    [`${prefix}-%`],
  )

  if (!latest.rows.length) {
    return `${prefix}-0001`
  }

  const lastPart = latest.rows[0].invoice_number.split('-').pop() || '0'
  const next = Number(lastPart) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}
