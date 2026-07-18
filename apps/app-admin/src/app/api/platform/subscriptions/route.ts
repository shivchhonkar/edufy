import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { createSubscription, listSubscriptions } from '@/lib/subscriptions';
import { jsonError, jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const subscriptions = await listSubscriptions();
  return jsonOk({ subscriptions });
}

export async function POST(request: NextRequest) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const organizationId = parseInt(String(body.organization_id ?? ''), 10);
  const plan = String(body.plan ?? '').trim();

  if (!Number.isFinite(organizationId) || !plan) {
    return jsonError('organization_id and plan are required', 400);
  }

  const subscription = await createSubscription({
    organization_id: organizationId,
    plan,
    status: String(body.status ?? 'active'),
    school_count_limit:
      body.school_count_limit === '' || body.school_count_limit == null
        ? null
        : parseInt(String(body.school_count_limit), 10),
    student_count_limit:
      body.student_count_limit === '' || body.student_count_limit == null
        ? null
        : parseInt(String(body.student_count_limit), 10),
    billing_cycle: body.billing_cycle ? String(body.billing_cycle) : 'annual',
    valid_from: body.valid_from ? String(body.valid_from) : null,
    valid_until: body.valid_until ? String(body.valid_until) : null,
  });

  return jsonOk({ subscription }, 201);
}
