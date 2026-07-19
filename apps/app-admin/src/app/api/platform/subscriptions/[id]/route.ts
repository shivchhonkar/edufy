import { NextRequest } from 'next/server';
import { withPlatformAdmin } from '@/lib/platform-route';
import { updateSubscription } from '@/lib/subscriptions';
import { jsonError, jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withPlatformAdmin(request, async () => {
    const subscriptionId = parseInt(params.id, 10);
    if (!Number.isFinite(subscriptionId)) {
      return jsonError('Invalid subscription id', 400);
    }

    const body = await request.json();
    const subscription = await updateSubscription(subscriptionId, {
      plan: body.plan ? String(body.plan) : undefined,
      status: body.status ? String(body.status) : undefined,
      school_count_limit:
        body.school_count_limit === '' || body.school_count_limit == null
          ? null
          : parseInt(String(body.school_count_limit), 10),
      student_count_limit:
        body.student_count_limit === '' || body.student_count_limit == null
          ? null
          : parseInt(String(body.student_count_limit), 10),
      billing_cycle: body.billing_cycle ? String(body.billing_cycle) : undefined,
      valid_from: body.valid_from ? String(body.valid_from) : undefined,
      valid_until: body.valid_until ? String(body.valid_until) : undefined,
    });

    if (!subscription) {
      return jsonError('Subscription not found', 404);
    }

    return jsonOk({ subscription });
  });
}
