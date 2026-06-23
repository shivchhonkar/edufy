import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { RepairService } from '@/lib/fees/RepairService';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const body = await request.json().catch(() => ({}));
    const academicYear = await resolveAcademicYear(
      db,
      body.academic_year ?? body.academicYear
    );

    const result = await RepairService.run(db, {
      academicYear,
      studentId: body.student_id ?? body.studentId,
      repairOrphans: body.repair_orphans ?? body.repairOrphans ?? true,
      repairTransportOrphans: body.repair_transport_orphans ?? body.repairTransportOrphans ?? true,
      reconcilePayments: body.reconcile_payments ?? body.reconcilePayments ?? true,
      recalculateStatuses: body.recalculate_statuses ?? body.recalculateStatuses ?? true,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Repair completed',
    });
  } catch (error) {
    console.error('Error running fee repair:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run repair',
      },
      { status: 500 }
    );
  }
}
