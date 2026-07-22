import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { loadPaymentReceiptData } from '@/lib/fees/load-payment-receipt-data';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);

    const receiptId = params.id;
    if (!receiptId) {
      return NextResponse.json(
        { success: false, error: 'Receipt ID is required' },
        { status: 400 },
      );
    }

    const data = await loadPaymentReceiptData(db, receiptId);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch receipt' },
      { status: 500 },
    );
  }
}
