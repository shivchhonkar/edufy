import { NextResponse } from 'next/server';
import {
  getSmsSenderId,
  getTwoFactorApiKey,
  isTwoFactorConfigured,
  isTwoFactorSmsReady,
} from '@/lib/two-factor-sms';
import { SMS_TEMPLATES } from '@/lib/sms-recipients';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      provider: '2factor.in',
      configured: isTwoFactorConfigured(),
      smsReady: isTwoFactorSmsReady(),
      otpApiKeySet: !!getTwoFactorApiKey(),
      senderIdSet: !!getSmsSenderId(),
      senderId: getSmsSenderId() || null,
      whatsappEnabled: false,
      whatsappNote: 'WhatsApp integration coming soon',
      templates: Object.entries(SMS_TEMPLATES).map(([key, value]) => ({
        key,
        ...value,
      })),
    },
  });
}
