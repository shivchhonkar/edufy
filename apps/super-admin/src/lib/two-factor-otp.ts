import { getTwoFactorApiKey, normalizePhoneForSms } from '@/lib/two-factor-sms';

const TWOFACTOR_BASE = 'https://2factor.in/API/V1';

function isSuccessResponse(data: { Status?: string }): boolean {
  const status = String(data?.Status || '').toLowerCase();
  return status === 'success' || status === '';
}

async function twoFactorGet(path: string) {
  const apiKey = getTwoFactorApiKey();
  if (!apiKey) {
    throw new Error('2Factor API key is not configured. Set OTP_API_KEY in .env.local');
  }

  const url = `${TWOFACTOR_BASE}/${apiKey}${path}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Shribi Edufy-GatePass/1.0' },
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { Status: res.ok ? 'Success' : 'Error', Details: text };
  }

  return { ok: res.ok, data };
}

/** Send OTP via 2factor AUTOGEN — returns session id in Details */
export async function sendGatePassOtp(phone: string): Promise<{
  success: boolean;
  sessionId: string | null;
  phone: string;
  error: string | null;
}> {
  const normalized = normalizePhoneForSms(phone);
  if (!normalized) {
    return { success: false, sessionId: null, phone, error: 'Invalid mobile number' };
  }

  const displayPhone =
    normalized.length === 12 && normalized.startsWith('91')
      ? normalized.slice(2)
      : normalized;

  const { ok, data } = await twoFactorGet(`/SMS/${displayPhone}/AUTOGEN`);
  const success = ok && isSuccessResponse(data as { Status?: string });
  const sessionId = success ? String(data.Details || '').trim() : null;

  return {
    success: success && !!sessionId,
    sessionId,
    phone: displayPhone,
    error: success
      ? sessionId
        ? null
        : 'OTP session id missing from provider response'
      : String(data.Details || data.Message || 'Failed to send OTP'),
  };
}

/** Verify OTP via 2factor VERIFY3 */
export async function verifyGatePassOtp(
  sessionId: string,
  otp: string
): Promise<{ success: boolean; error: string | null }> {
  const sid = String(sessionId || '').trim();
  const code = String(otp || '').trim();
  if (!sid || !code) {
    return { success: false, error: 'Session id and OTP are required' };
  }

  const { ok, data } = await twoFactorGet(`/SMS/VERIFY3/${encodeURIComponent(sid)}/${encodeURIComponent(code)}`);
  const success = ok && isSuccessResponse(data as { Status?: string });

  return {
    success,
    error: success ? null : String(data.Details || data.Message || 'Invalid or expired OTP'),
  };
}
