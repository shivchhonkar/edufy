const TWOFACTOR_BASE = 'https://2factor.in/API/V1';

export type SmsType = 'transactional' | 'promotional';

export function getTwoFactorApiKey(): string {
  return String(process.env.OTP_API_KEY || process.env.TWOFACTOR_API_KEY || '').trim();
}

export function getSmsSenderId(): string {
  return String(
    process.env.SMS_SENDER_ID ||
      process.env.TRANSACTIONAL_SMS_SENDER_ID ||
      process.env.TWOFACTOR_SENDER_ID ||
      ''
  ).trim();
}

export function isTwoFactorConfigured(): boolean {
  return !!getTwoFactorApiKey();
}

export function isTwoFactorSmsReady(): boolean {
  return !!getTwoFactorApiKey() && !!getSmsSenderId();
}

/** India E.164 (91XXXXXXXXXX) for 2Factor TSMS/PSMS */
export function normalizePhoneForSms(phone: string): string | null {
  if (!String(phone || '').trim()) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export function displayPhone(phone: string): string {
  const normalized = normalizePhoneForSms(phone);
  if (!normalized) return phone;
  if (normalized.length === 12 && normalized.startsWith('91')) {
    return normalized.slice(2);
  }
  return normalized;
}

function isSuccessResponse(data: { Status?: string }): boolean {
  const status = String(data?.Status || '').toLowerCase();
  return status === 'success' || status === '';
}

async function twoFactorJsonPost(path: string, body: Record<string, string>) {
  const apiKey = getTwoFactorApiKey();
  if (!apiKey) {
    throw new Error('2Factor API key is not configured. Set OTP_API_KEY in .env.local');
  }

  const url = `${TWOFACTOR_BASE}/${apiKey}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Shribi Edufy-Communications/1.0',
    },
    body: JSON.stringify(body),
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

async function twoFactorGet(path: string) {
  const apiKey = getTwoFactorApiKey();
  if (!apiKey) {
    throw new Error('2Factor API key is not configured. Set OTP_API_KEY in .env.local');
  }

  const url = `${TWOFACTOR_BASE}/${apiKey}${path}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Shribi Edufy-Communications/1.0' },
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

export async function getTwoFactorBalances() {
  const balances: Record<string, unknown> = {};
  for (const [key, path] of [
    ['transactional', '/ADDON_SERVICES/BAL/TRANSACTIONAL_SMS'],
    ['promotional', '/ADDON_SERVICES/BAL/PROMOTIONAL_SMS'],
  ] as const) {
    try {
      const { data } = await twoFactorGet(path);
      balances[key] = data;
    } catch (error) {
      balances[key] = {
        Status: 'Error',
        Details: error instanceof Error ? error.message : 'Balance fetch failed',
      };
    }
  }
  return balances;
}

export interface SendSmsResult {
  success: boolean;
  phone: string;
  response: Record<string, unknown>;
  error: string | null;
}

export async function sendOpenSms({
  to,
  message,
  senderId,
  smsType = 'transactional',
}: {
  to: string;
  message: string;
  senderId?: string;
  smsType?: SmsType;
}): Promise<SendSmsResult> {
  const phone = normalizePhoneForSms(to);
  if (!phone) {
    return {
      success: false,
      phone: to,
      response: {},
      error: `Invalid phone number: ${to}`,
    };
  }

  const from = String(senderId || getSmsSenderId()).trim();
  if (!from) {
    return {
      success: false,
      phone: displayPhone(phone),
      response: {},
      error: 'Sender ID is required. Set SMS_SENDER_ID in .env.local',
    };
  }

  const msg = String(message || '').trim();
  if (!msg) {
    return {
      success: false,
      phone: displayPhone(phone),
      response: {},
      error: 'Message text is required',
    };
  }

  const endpoint =
    smsType === 'promotional'
      ? '/ADDON_SERVICES/SEND/PSMS'
      : '/ADDON_SERVICES/SEND/TSMS';

  const { ok, data } = await twoFactorJsonPost(endpoint, {
    From: from,
    To: phone,
    Msg: msg.slice(0, 500),
  });

  const success = ok && isSuccessResponse(data as { Status?: string });
  return {
    success,
    phone: displayPhone(phone),
    response: data,
    error: success
      ? null
      : String(data.Details || data.Message || 'SMS send failed'),
  };
}
