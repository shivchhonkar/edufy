import { NextRequest, NextResponse } from 'next/server'
import { query } from '@edulakhya/database'
import {
  ensureInventoryInvoiceTables,
  generateInventoryInvoiceNumber,
} from '@/lib/inventory-invoice'

export async function GET(req: NextRequest) {
  try {
    await ensureInventoryInvoiceTables()

    const searchParams = req.nextUrl.searchParams
    const studentId = searchParams.get('student_id')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    const params: unknown[] = []
    let sql = `
      SELECT
        inv.id,
        inv.invoice_number,
        inv.student_id,
        inv.subtotal,
        inv.gst_amount,
        inv.discount_amount,
        inv.total_amount,
        inv.payment_status,
        inv.remarks,
        inv.created_at,
        s.admission_number,
        s.first_name,
        s.last_name,
        COALESCE(SUM(ii.quantity), 0) AS total_items
      FROM inventory_invoices inv
      LEFT JOIN students s ON inv.student_id = s.id
      LEFT JOIN inventory_invoice_items ii ON ii.invoice_id = inv.id
      WHERE 1=1
    `

    if (studentId) {
      params.push(studentId)
      sql += ` AND inv.student_id = $${params.length}`
    }

    if (status) {
      params.push(status)
      sql += ` AND inv.payment_status = $${params.length}`
    }

    if (fromDate) {
      params.push(fromDate)
      sql += ` AND inv.created_at::date >= $${params.length}::date`
    }

    if (toDate) {
      params.push(toDate)
      sql += ` AND inv.created_at::date <= $${params.length}::date`
    }

    sql += `
      GROUP BY inv.id, s.admission_number, s.first_name, s.last_name
      ORDER BY inv.created_at DESC
      LIMIT 200
    `

    const result = await query(sql, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error: any) {
    console.error('Error fetching sales invoices:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInventoryInvoiceTables()

    const body = await req.json()
    const studentId = Number(body.student_id)
    const createdBy = Number(body.created_by || 1)
    const paymentStatus = String(body.payment_status || 'paid')
    const discountAmount = Number(body.discount_amount || 0)
    const remarks = body.remarks ? String(body.remarks) : null
    const items = Array.isArray(body.items) ? body.items : []

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student is required' }, { status: 400 })
    }
    if (!items.length) {
      return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 })
    }

    const invoiceLines: Array<{
      item_id: number
      quantity: number
      unit_price: number
      gst_percentage: number
      gst_amount: number
      total_amount: number
    }> = []

    let subtotal = 0
    let gstTotal = 0

    for (const raw of items) {
      const itemId = Number(raw.item_id)
      const qty = Number(raw.quantity)
      const unitPrice = Number(raw.unit_price || 0)

      if (!itemId || !qty || qty <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each line must include valid item and quantity' },
          { status: 400 },
        )
      }

      const stockCheck = await query<{
        id: number
        item_name: string
        quantity: number
        gst_percentage: string | number | null
      }>(
        `SELECT id, item_name, quantity, gst_percentage
         FROM inventory_items
         WHERE id = $1`,
        [itemId],
      )

      if (!stockCheck.rows.length) {
        return NextResponse.json({ success: false, error: `Item ${itemId} not found` }, { status: 404 })
      }

      const current = Number(stockCheck.rows[0].quantity || 0)
      if (current < qty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for ${stockCheck.rows[0].item_name}. Available: ${current}, requested: ${qty}`,
          },
          { status: 400 },
        )
      }

      const gstRate = Number(stockCheck.rows[0].gst_percentage || 0)
      const lineBase = unitPrice * qty
      const lineGst = Number((lineBase * gstRate / 100).toFixed(2))
      const lineTotal = Number((lineBase + lineGst).toFixed(2))

      subtotal += lineBase
      gstTotal += lineGst

      invoiceLines.push({
        item_id: itemId,
        quantity: qty,
        unit_price: unitPrice,
        gst_percentage: gstRate,
        gst_amount: lineGst,
        total_amount: lineTotal,
      })
    }

    const totalAmount = Number((subtotal + gstTotal - discountAmount).toFixed(2))
    const invoiceNumber = await generateInventoryInvoiceNumber()

    const invoiceResult = await query<{ id: number }>(
      `INSERT INTO inventory_invoices (
        invoice_number, student_id, subtotal, gst_amount, discount_amount, total_amount,
        payment_status, remarks, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        invoiceNumber,
        studentId,
        subtotal,
        gstTotal,
        discountAmount,
        totalAmount,
        paymentStatus,
        remarks,
        createdBy,
      ],
    )

    const invoiceId = invoiceResult.rows[0].id

    for (const line of invoiceLines) {
      await query(
        `INSERT INTO inventory_invoice_items (
          invoice_id, item_id, quantity, unit_price, gst_percentage, gst_amount, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          invoiceId,
          line.item_id,
          line.quantity,
          line.unit_price,
          line.gst_percentage,
          line.gst_amount,
          line.total_amount,
        ],
      )

      await query(
        `INSERT INTO inventory_transactions (
          item_id, transaction_type, quantity, transaction_date,
          issued_to_type, issued_to_id, unit_price, total_amount,
          remarks, created_by
        ) VALUES ($1, 'issue', $2, CURRENT_DATE, 'student', $3, $4, $5, $6, $7)`,
        [
          line.item_id,
          line.quantity,
          studentId,
          line.unit_price,
          line.total_amount,
          `Invoice ${invoiceNumber} (id: ${invoiceId})`,
          createdBy,
        ],
      )

      await query(
        `UPDATE inventory_items
         SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [line.quantity, line.item_id],
      )

      await query(
        `INSERT INTO student_inventory (
          student_id, item_id, quantity, issue_date, amount_charged, status
        ) VALUES ($1, $2, $3, CURRENT_DATE, $4, 'issued')`,
        [studentId, line.item_id, line.quantity, line.total_amount],
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        subtotal,
        gst_amount: gstTotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        items: invoiceLines,
      },
    })
  } catch (error: any) {
    console.error('Error creating sales invoice:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}


























































