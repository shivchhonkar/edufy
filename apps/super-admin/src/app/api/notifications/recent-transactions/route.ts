import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'

export interface RecentTransaction {
  id: number
  type: 'fee_payment'
  title: string
  subtitle: string
  amount: number
  time: string
  href: string
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}


export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    const result = await db.query(
      `SELECT fp.id, fp.amount_paid, fp.payment_date, fp.payment_method, fp.receipt_number,
              s.first_name, s.last_name, s.admission_number
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       WHERE fp.status = 'completed'
       ORDER BY fp.payment_date DESC
       LIMIT 10`,
    )

    const transactions: RecentTransaction[] = result.rows.map((row) => {
      const amount = parseFloat(String(row.amount_paid || 0))
      const studentName = `${row.first_name || ''} ${row.last_name || ''}`.trim()
      const method = row.payment_method ? String(row.payment_method) : 'Payment'
      const receipt = row.receipt_number ? `Receipt ${row.receipt_number}` : row.admission_number

      return {
        id: Number(row.id),
        type: 'fee_payment',
        title: `Fee received — ${studentName}`,
        subtitle: `${method}${receipt ? ` · ${receipt}` : ''}`,
        amount,
        time: formatRelativeTime(String(row.payment_date)),
        href: '/fees/receipts',
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
      },
    })
  } catch (error) {
    console.error('Error fetching recent transactions:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch recent transactions'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
