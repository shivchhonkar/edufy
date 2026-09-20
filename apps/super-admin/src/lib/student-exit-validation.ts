import type { RequestDb } from '@/lib/request-db';
import { getActiveTransportAssignment } from '@/lib/transport-fee-sync';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { ensureFeeExtensions } from '@/lib/fees/ensure-fee-extensions';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { academicYearFilterValues } from '@/lib/fees/AcademicYear';
import { EXCLUDE_INACTIVE_OUTSTANDING_FEES } from '@/lib/fees/active-student-fee-filter';
import type { Student } from '@/shared/types';
import {
  CLEARANCE_DEPARTMENTS,
  type ExitValidationItem,
  type ExitValidationSnapshot,
} from '@/lib/student-exit-utils';

async function tableExists(db: RequestDb, tableName: string): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function validateFees(db: RequestDb, studentId: number): Promise<ExitValidationItem> {
  await ensureFeeSchema(db);
  await ensureFeeExtensions(db);

  const academicYear = await resolveAcademicYear(db, null);
  const yearFilter = academicYearFilterValues(academicYear);

  const result = await db.query<{ balance: string }>(
    `SELECT COALESCE(SUM(GREATEST(sf.amount_due - sf.amount_paid, 0)), 0)::text AS balance
     FROM student_fees sf
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     INNER JOIN students s ON s.id = sf.student_id
     WHERE sf.student_id = $1
       AND sf.academic_year = ANY($2::text[])
       AND GREATEST(sf.amount_due - sf.amount_paid, 0) > 0
       ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}`,
    [studentId, yearFilter]
  );

  const amountDue = parseFloat(result.rows[0]?.balance || '0');
  if (amountDue <= 0) {
    return {
      department: 'fees',
      label: 'Fees',
      status: 'cleared',
      summary: 'Cleared',
      amount_due: 0,
    };
  }

  return {
    department: 'fees',
    label: 'Fees',
    status: 'pending',
    summary: `₹${amountDue.toLocaleString('en-IN')} Due`,
    amount_due: amountDue,
  };
}

async function validateLibrary(db: RequestDb, student: Student): Promise<ExitValidationItem> {
  try {
    if (!(await tableExists(db, 'library_issues'))) {
      return {
        department: 'library',
        label: 'Library',
        status: 'not_applicable',
        summary: 'Not Applicable',
        pending_count: 0,
      };
    }

    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM library_issues
       WHERE student_id = $1 AND status = 'issued'`,
      [student.id]
    );
    const pendingCount = parseInt(result.rows[0]?.count || '0', 10);

    if (pendingCount <= 0) {
      return {
        department: 'library',
        label: 'Library',
        status: 'cleared',
        summary: 'Cleared',
        pending_count: 0,
      };
    }

    return {
      department: 'library',
      label: 'Library',
      status: 'pending',
      summary: `${pendingCount} Book${pendingCount === 1 ? '' : 's'} Pending`,
      pending_count: pendingCount,
    };
  } catch {
    return {
      department: 'library',
      label: 'Library',
      status: 'not_applicable',
      summary: 'Not Applicable',
    };
  }
}

async function validateTransport(db: RequestDb, studentId: number): Promise<ExitValidationItem> {
  const academicYear = await resolveAcademicYear(db, null);
  const assignment = await getActiveTransportAssignment(db, studentId, academicYear);

  if (!assignment) {
    return {
      department: 'transport',
      label: 'Transport',
      status: 'not_applicable',
      summary: 'Not Applicable',
    };
  }

  const routeName = assignment.route_name || 'Active route';
  return {
    department: 'transport',
    label: 'Transport',
    status: 'pending',
    summary: `${routeName} — clearance required`,
  };
}

async function validateHostel(db: RequestDb, studentId: number): Promise<ExitValidationItem> {
  const hasHostelTable =
    (await tableExists(db, 'student_hostel')) ||
    (await tableExists(db, 'hostel_allocations')) ||
    (await tableExists(db, 'hostel_assignments'));

  if (!hasHostelTable) {
    return {
      department: 'hostel',
      label: 'Hostel',
      status: 'not_applicable',
      summary: 'Not Applicable',
    };
  }

  const tableName = (await tableExists(db, 'student_hostel'))
    ? 'student_hostel'
    : (await tableExists(db, 'hostel_allocations'))
      ? 'hostel_allocations'
      : 'hostel_assignments';

  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${tableName}
     WHERE student_id = $1
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
    [studentId]
  );

  const count = parseInt(result.rows[0]?.count || '0', 10);
  if (count <= 0) {
    return {
      department: 'hostel',
      label: 'Hostel',
      status: 'not_applicable',
      summary: 'Not Applicable',
    };
  }

  return {
    department: 'hostel',
    label: 'Hostel',
    status: 'pending',
    summary: 'Active hostel allocation',
    pending_count: count,
  };
}

async function validateInventory(db: RequestDb, studentId: number): Promise<ExitValidationItem> {
  if (!(await tableExists(db, 'student_inventory'))) {
    return {
      department: 'inventory',
      label: 'Inventory',
      status: 'not_applicable',
      summary: 'Not Applicable',
    };
  }

  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM student_inventory
     WHERE student_id = $1 AND status = 'issued'`,
    [studentId]
  );

  const count = parseInt(result.rows[0]?.count || '0', 10);
  if (count <= 0) {
    return {
      department: 'inventory',
      label: 'Inventory',
      status: 'cleared',
      summary: 'Cleared',
      pending_count: 0,
    };
  }

  return {
    department: 'inventory',
    label: 'Inventory',
    status: 'pending',
    summary: `${count} item${count === 1 ? '' : 's'} pending return`,
    pending_count: count,
  };
}

async function validateExamination(db: RequestDb, studentId: number): Promise<ExitValidationItem> {
  await ensureFeeSchema(db);
  const academicYear = await resolveAcademicYear(db, null);
  const yearFilter = academicYearFilterValues(academicYear);

  const examFees = await db.query<{ balance: string }>(
    `SELECT COALESCE(SUM(GREATEST(sf.amount_due - sf.amount_paid, 0)), 0)::text AS balance
     FROM student_fees sf
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     WHERE sf.student_id = $1
       AND sf.academic_year = ANY($2::text[])
       AND fs.fee_type ILIKE '%exam%'`,
    [studentId, yearFilter]
  );

  const examDue = parseFloat(examFees.rows[0]?.balance || '0');
  if (examDue > 0) {
    return {
      department: 'examination',
      label: 'Examination',
      status: 'pending',
      summary: `Exam fees ₹${examDue.toLocaleString('en-IN')} due`,
      amount_due: examDue,
    };
  }

  if (!(await tableExists(db, 'results'))) {
    return {
      department: 'examination',
      label: 'Examination',
      status: 'cleared',
      summary: 'Cleared',
    };
  }

  return {
    department: 'examination',
    label: 'Examination',
    status: 'cleared',
    summary: 'Cleared',
  };
}

async function validateAccounts(feesItem: ExitValidationItem): Promise<ExitValidationItem> {
  if (feesItem.status === 'not_applicable' || feesItem.status === 'cleared') {
    return {
      department: 'accounts',
      label: 'Accounts',
      status: 'cleared',
      summary: 'Cleared',
      amount_due: 0,
    };
  }

  return {
    department: 'accounts',
    label: 'Accounts',
    status: 'pending',
    summary: feesItem.summary,
    amount_due: feesItem.amount_due,
  };
}

export async function runStudentExitValidation(
  db: RequestDb,
  student: Student
): Promise<ExitValidationSnapshot> {
  const feesItem = await validateFees(db, student.id);
  const items: ExitValidationItem[] = [
    feesItem,
    await validateLibrary(db, student),
    await validateTransport(db, student.id),
    await validateHostel(db, student.id),
    await validateInventory(db, student.id),
    await validateExamination(db, student.id),
    await validateAccounts(feesItem),
  ];

  const hasBlockers = items.some((item) => item.status === 'pending');

  return {
    items,
    validated_at: new Date().toISOString(),
    has_blockers: hasBlockers,
  };
}

export function getValidationLabel(department: string): string {
  return CLEARANCE_DEPARTMENTS.find((dept) => dept.key === department)?.label || department;
}
