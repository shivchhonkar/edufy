import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

const MONTH_LABELS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const;

type FeeRow = {
  id: number;
  month?: number | null;
  due_date?: string | null;
  amount_due?: string | number | null;
  amount_paid?: string | number | null;
  late_fee_amount?: string | number | null;
  status?: string | null;
  fee_type?: string | null;
  category_name?: string | null;
  updated_at?: string | null;
  academic_year?: string | null;
};

function parseAmount(value: unknown): number {
  const amount = parseFloat(String(value ?? 0));
  return Number.isFinite(amount) ? amount : 0;
}

function isTransportFee(fee: FeeRow): boolean {
  const label = `${fee.fee_type || ''} ${fee.category_name || ''}`.toLowerCase();
  return label.includes('transport');
}

function isImprestFee(fee: FeeRow): boolean {
  const label = `${fee.fee_type || ''} ${fee.category_name || ''}`.toLowerCase();
  return label.includes('imprest');
}

function getOutstanding(fee: FeeRow): number {
  if (fee.status === 'waived' || fee.status === 'exempted') {
    return 0;
  }

  const principal = Math.max(
    0,
    parseAmount(fee.amount_due) - parseAmount(fee.amount_paid),
  );
  const lateFee = principal > 0 ? parseAmount(fee.late_fee_amount) : 0;
  return principal + lateFee;
}

function resolveMonth(fee: FeeRow): number {
  if (fee.month != null && fee.month >= 1 && fee.month <= 12) {
    return fee.month;
  }

  if (fee.due_date) {
    const date = new Date(fee.due_date);
    if (!Number.isNaN(date.getTime())) {
      return date.getMonth() + 1;
    }
  }

  return 0;
}

function buildInstallment(fee: FeeRow) {
  const month = resolveMonth(fee);
  const outstanding = getOutstanding(fee);
  const amountDue = parseAmount(fee.amount_due);
  const amountPaid = parseAmount(fee.amount_paid);
  const isPaid = outstanding <= 0 || fee.status === 'paid';

  return {
    id: fee.id,
    feeIds: [fee.id],
    month,
    monthLabel: month > 0 ? MONTH_LABELS[month - 1] : 'FEE',
    amount: outstanding,
    amountDue,
    amountPaid,
    dueDate: fee.due_date,
    paidDate: isPaid ? fee.updated_at ?? fee.due_date : null,
    status: isPaid ? 'paid' : fee.status || 'pending',
    feeType: fee.fee_type || fee.category_name || 'Fee',
    isPaid,
  };
}

function mergeInstallments(items: ReturnType<typeof buildInstallment>[]) {
  const grouped = new Map<string, ReturnType<typeof buildInstallment>>();

  items.forEach((item) => {
    const key = `${item.month}-${item.feeType}`;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...item, feeIds: [...item.feeIds] });
      return;
    }

    existing.amount += item.amount;
    existing.amountDue += item.amountDue;
    existing.amountPaid += item.amountPaid;
    existing.feeIds.push(...item.feeIds);
    existing.isPaid = existing.amount <= 0;
    existing.status = existing.isPaid ? 'paid' : existing.status;
    existing.paidDate = existing.paidDate ?? item.paidDate;
    if (item.dueDate && (!existing.dueDate || item.dueDate < existing.dueDate)) {
      existing.dueDate = item.dueDate;
    }
  });

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.month !== right.month) {
      return left.month - right.month;
    }
    return left.feeType.localeCompare(right.feeType);
  });
}

function splitInstallments(fees: FeeRow[]) {
  const schoolFees = fees.filter((fee) => !isTransportFee(fee) && !isImprestFee(fee));
  const transportFees = fees.filter((fee) => isTransportFee(fee));
  const imprestFees = fees.filter((fee) => isImprestFee(fee));

  const schoolInstallments = mergeInstallments(schoolFees.map(buildInstallment));
  const transportInstallments = mergeInstallments(transportFees.map(buildInstallment));

  const unpaidSchool = schoolInstallments.filter((item) => !item.isPaid && item.amount > 0);
  const unpaidTransport = transportInstallments.filter((item) => !item.isPaid && item.amount > 0);
  const paidInstallments = [...schoolInstallments, ...transportInstallments]
    .filter((item) => item.isPaid)
    .sort((left, right) => left.month - right.month);

  const imprestAmount = imprestFees.reduce((sum, fee) => sum + getOutstanding(fee), 0);

  return {
    schoolFeeDue: unpaidSchool.reduce((sum, item) => sum + item.amount, 0),
    transportFeeDue: unpaidTransport.reduce((sum, item) => sum + item.amount, 0),
    imprestAmount,
    unpaid: {
      school: unpaidSchool,
      transport: unpaidTransport,
    },
    paid: paidInstallments,
  };
}

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const requestedSession = searchParams.get('academicYear')?.trim() || null;

    const settingsResult = await db.query(
      'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1',
    );
    const currentSession =
      settingsResult.rows[0]?.academic_year?.trim() ||
      `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;

    const sessionsResult = await db.query(
      `SELECT DISTINCT academic_year
       FROM student_fees
       WHERE student_id = $1
         AND academic_year IS NOT NULL
         AND TRIM(academic_year) <> ''
       ORDER BY academic_year DESC`,
      [studentId],
    );

    const sessions = sessionsResult.rows
      .map((row: { academic_year?: string }) => row.academic_year?.trim())
      .filter(Boolean) as string[];

    if (!sessions.includes(currentSession)) {
      sessions.unshift(currentSession);
    }

    const activeSession =
      requestedSession && sessions.includes(requestedSession)
        ? requestedSession
        : sessions[0] || currentSession;

    const feesResult = await db.query(
      `SELECT sf.*, fs.fee_type, fc.name AS category_name
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
       LEFT JOIN fee_categories fc ON fs.category_id = fc.id
       WHERE sf.student_id = $1
         AND sf.academic_year = $2
       ORDER BY sf.month NULLS LAST, sf.due_date`,
      [studentId, activeSession],
    );

    const fees = feesResult.rows as FeeRow[];
    const paymentPlan = splitInstallments(fees);

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        currentSession: activeSession,
        ...paymentPlan,
      },
    });
  } catch (error) {
    console.error('Error fetching parent fee payment plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee payment details' },
      { status: 500 },
    );
  }
}
