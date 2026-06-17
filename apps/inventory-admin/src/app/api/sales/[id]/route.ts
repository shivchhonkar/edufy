import { NextRequest, NextResponse } from 'next/server'
import { query } from '@edulakhya/database'
import { ensureInventoryInvoiceTables } from '@/lib/inventory-invoice'
import { fetchSchoolPrintSettings } from '@/lib/school-info'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await ensureInventoryInvoiceTables()
    const invoiceId = Number(params.id)
    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'Invalid invoice id' }, { status: 400 })
    }

    const header = await query(
      `SELECT
        inv.*,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.parent_name,
        s.parent_phone,
        s.address,
        s.city,
        s.state,
        c.name AS class_name,
        sec.name AS section_name,
        (
          SELECT g.name
          FROM student_guardians g
          WHERE g.student_id = s.id AND g.relation_type = 'mother'
          LIMIT 1
        ) AS mother_name
      FROM inventory_invoices inv
      LEFT JOIN students s ON inv.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE inv.id = $1`,
      [invoiceId],
    )

    if (!header.rows.length) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    const lines = await query(
      `SELECT
        li.*,
        ii.item_name,
        ii.item_code,
        ii.unit
      FROM inventory_invoice_items li
      JOIN inventory_items ii ON li.item_id = ii.id
      WHERE li.invoice_id = $1
      ORDER BY li.id ASC`,
      [invoiceId],
    )

    const row = header.rows[0]
    const host = req.headers.get('host')
    const school = await fetchSchoolPrintSettings(host)

    return NextResponse.json({
      success: true,
      data: {
        invoice: {
          id: row.id,
          invoice_number: row.invoice_number,
          student_id: row.student_id,
          subtotal: row.subtotal,
          gst_amount: row.gst_amount,
          discount_amount: row.discount_amount,
          total_amount: row.total_amount,
          payment_status: row.payment_status,
          remarks: row.remarks,
          created_at: row.created_at,
          created_by: row.created_by,
        },
        items: lines.rows,
        student: {
          first_name: row.first_name,
          last_name: row.last_name,
          admission_number: row.admission_number,
          parent_name: row.parent_name,
          parent_phone: row.parent_phone,
          mother_name: row.mother_name,
          address: row.address,
          city: row.city,
          state: row.state,
          class_name: row.class_name,
          section_name: row.section_name,
        },
        school,
      },
    })
  } catch (error: any) {
    console.error('Error fetching invoice detail:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
