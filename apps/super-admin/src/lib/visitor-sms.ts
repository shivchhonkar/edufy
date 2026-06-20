import { isTwoFactorSmsReady, sendOpenSms } from '@/lib/two-factor-sms';

export interface VisitorSmsPayload {
  visitor_name: string;
  phone: string;
  purpose: string;
  person_to_meet: string;
  visitor_number: string;
}

export function buildVisitorCheckInSmsMessage(
  visitor: VisitorSmsPayload,
  schoolName = 'School',
): string {
  const message =
    `${schoolName}: Visitor ${visitor.visitor_name} (${visitor.phone}) has checked in to meet ` +
    `${visitor.person_to_meet}. Purpose: ${visitor.purpose}. Pass: ${visitor.visitor_number}`;
  return message.slice(0, 480);
}

export async function sendVisitorCheckInSms(
  to: string,
  visitor: VisitorSmsPayload,
  schoolName?: string,
) {
  if (!isTwoFactorSmsReady()) {
    return {
      success: false,
      skipped: true,
      error: 'SMS is not configured. Set OTP_API_KEY and SMS_SENDER_ID.',
    };
  }

  try {
    const message = buildVisitorCheckInSmsMessage(visitor, schoolName);
    const result = await sendOpenSms({ to, message, smsType: 'transactional' });

    return {
      success: result.success,
      skipped: false,
      error: result.error,
      phone: result.phone,
    };
  } catch (error) {
    return {
      success: false,
      skipped: false,
      error: error instanceof Error ? error.message : 'SMS send failed',
    };
  }
}
