import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { syncTransportFees } from '@/lib/transport-fee-sync';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    let body: { student_id?: number; academic_year?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const academicYear = await resolveAcademicYear(db, body.academic_year ?? null);
    const result = await syncTransportFees(db, academicYear, body.student_id);

    return NextResponse.json({
      success: true,
      data: { ...result, academic_year: academicYear },
      message: `Synced transport fees for ${result.students_processed} student(s)`,
    });
  } catch (error) {
    console.error('Error syncing transport fees:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync transport fees';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
