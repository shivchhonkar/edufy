import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';

/** Bulk-deactivate fee types for an academic year and remove pending student fees. */
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const body = await request.json();
    const academicYear = await resolveAcademicYear(db, body.academic_year);
    const feeTypes = Array.isArray(body.fee_types)
      ? body.fee_types.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];

    if (feeTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'fee_types array is required' },
        { status: 400 }
      );
    }

    const result = await FeeGenerationService.deactivateFeeTypes(db, {
      academicYear,
      feeTypes,
    });

    const maintenance = await FeeGenerationService.runFeeRecordMaintenance(db, academicYear);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        ...maintenance,
      },
      message: `Deactivated ${result.structuresDeactivated} fee structure(s) and cleaned ${maintenance.staleRemoved + maintenance.duplicatesRemoved} duplicate fee record(s)`,
    });
  } catch (error) {
    console.error('Error deactivating fee types:', error);
    const message = error instanceof Error ? error.message : 'Failed to deactivate fee types';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
