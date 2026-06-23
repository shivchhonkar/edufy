import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { InstallmentService } from '@/lib/fees/InstallmentService';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const feeStructureId = request.nextUrl.searchParams.get('fee_structure_id');
    if (!feeStructureId) {
      return NextResponse.json(
        { success: false, error: 'fee_structure_id is required' },
        { status: 400 }
      );
    }

    const plan = await InstallmentService.getPlan(db, parseInt(feeStructureId, 10));
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch installment plan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const body = await request.json();
    const { fee_structure_id, installment_count } = body;

    if (!fee_structure_id || !installment_count || installment_count < 2) {
      return NextResponse.json(
        { success: false, error: 'fee_structure_id and installment_count (>= 2) are required' },
        { status: 400 }
      );
    }

    const planId = await InstallmentService.upsertPlan(db, {
      feeStructureId: parseInt(String(fee_structure_id), 10),
      installmentCount: parseInt(String(installment_count), 10),
    });

    return NextResponse.json({
      success: true,
      data: { id: planId, fee_structure_id, installment_count },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save installment plan' },
      { status: 500 }
    );
  }
}
