import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { FeeScheduler } from '@/lib/fees/FeeScheduler';

const VALID_JOBS = [
  'monthly_generation',
  'payment_reconciliation',
  'data_repair',
  'transport_sync',
] as const;

type SchedulerJob = (typeof VALID_JOBS)[number];

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const body = await request.json();
    const job = body.job as SchedulerJob;
    const academicYear = await resolveAcademicYear(
      db,
      body.academic_year ?? body.academicYear
    );

    if (!job || !VALID_JOBS.includes(job)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid job. Supported: ${VALID_JOBS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let result: unknown;

    switch (job) {
      case 'monthly_generation':
        result = await FeeScheduler.runMonthlyGeneration(db, academicYear);
        break;
      case 'payment_reconciliation':
        result = await FeeScheduler.runPaymentReconciliation(db, academicYear);
        break;
      case 'data_repair':
        result = await FeeScheduler.runDataRepair(db, academicYear);
        break;
      case 'transport_sync':
        result = await FeeScheduler.runTransportSync(db, academicYear);
        break;
    }

    return NextResponse.json({
      success: true,
      job,
      academic_year: academicYear,
      data: result,
    });
  } catch (error) {
    console.error('Scheduler job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Scheduler job failed',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      jobs: VALID_JOBS,
      usage: 'POST { job, academic_year? }',
    },
  });
}
