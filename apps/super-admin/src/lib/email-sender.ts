export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  queued?: boolean;
  response?: unknown;
}

export function isEmailReady(): boolean {
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM;
  return Boolean(process.env.RESEND_API_KEY && from);
}

export function getEmailConfigStatus() {
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM;
  return {
    emailReady: isEmailReady(),
    resendApiKeySet: Boolean(process.env.RESEND_API_KEY),
    fromAddressSet: Boolean(from),
    fromAddress: from || null,
  };
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !from) {
    return {
      success: false,
      queued: true,
      error:
        'Email delivery is not configured. Set RESEND_API_KEY and SMTP_FROM (or EMAIL_FROM) in .env.local',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html || undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: (data as { message?: string }).message || `Email API error (${response.status})`,
        response: data,
      };
    }

    return { success: true, response: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:sans-serif;line-height:1.5;white-space:pre-wrap">${escaped}</div>`;
}
