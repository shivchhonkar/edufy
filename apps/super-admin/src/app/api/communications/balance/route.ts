import { NextResponse } from 'next/server';
import { getTwoFactorBalances, isTwoFactorConfigured } from '@/lib/two-factor-sms';

export async function GET() {
  try {
    if (!isTwoFactorConfigured()) {
      return NextResponse.json(
        { success: false, error: 'OTP_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const balances = await getTwoFactorBalances();
    return NextResponse.json({ success: true, data: balances });
  } catch (error) {
    console.error('Error fetching 2Factor balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SMS balance' },
      { status: 500 }
    );
  }
}
