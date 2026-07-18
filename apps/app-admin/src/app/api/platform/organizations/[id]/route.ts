import { NextRequest } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import {
  getOrganizationWithSubscription,
  setOrganizationActive,
  updateOrganizationLimits,
} from '@/lib/subscriptions';
import { jsonError, jsonOk } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const organizationId = parseInt(params.id, 10);
  if (!Number.isFinite(organizationId)) {
    return jsonError('Invalid organization id', 400);
  }

  const organization = await getOrganizationWithSubscription(organizationId);
  if (!organization) {
    return jsonError('Organization not found', 404);
  }

  return jsonOk({ organization });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  const organizationId = parseInt(params.id, 10);
  if (!Number.isFinite(organizationId)) {
    return jsonError('Invalid organization id', 400);
  }

  const body = await request.json();
  const hasMaxSchools = Object.prototype.hasOwnProperty.call(body, 'max_schools');
  const maxSchools = hasMaxSchools
    ? body.max_schools === null || body.max_schools === ''
      ? null
      : parseInt(String(body.max_schools), 10)
    : undefined;
  const isActive =
    typeof body.is_active === 'boolean' ? body.is_active : undefined;

  if (isActive !== undefined && !hasMaxSchools) {
    await setOrganizationActive(organizationId, isActive);
  } else {
    await updateOrganizationLimits(organizationId, {
      max_schools: Number.isFinite(maxSchools as number) ? maxSchools : hasMaxSchools ? null : undefined,
      is_active: isActive,
    });
  }

  const organization = await getOrganizationWithSubscription(organizationId);
  return jsonOk({ organization });
}
