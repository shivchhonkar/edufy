import { NextRequest, NextResponse } from 'next/server';
import { authenticateUnifiedLogin } from '@/lib/authenticate-login';
import {
  authenticateOrganizationLogin,
  resolveOrganizationFromHost,
} from '@/lib/org-auth';
import {
  buildLoginGuardKey,
  clearLoginGuard,
  enforceLoginGuard,
  failLoginGuard,
  type LoginGuardState,
} from '@/lib/login-guard';
import { getRequestDb, TenantResolutionError } from '@/lib/request-db';
import { getServerAuthCookieOptions } from '@/lib/auth-cookie';
import { toJsonSafe } from '@/lib/json-safe';
import { resolveHostContext } from '@/lib/host-context';
import { extractSubdomain } from '@/lib/tenant-host';
import {
  getOrganizationById,
  getSchoolsForOrganization,
  resolveSchoolCodeLookup,
  schoolBelongsToLookup,
} from '@edulakhya/tenant';

function loginSuccessResponse(
  data: Record<string, unknown>,
  token: string,
  requestHost?: string | null,
) {
  const payload = {
    success: true as const,
    data: toJsonSafe(data),
    message: 'Login successful',
  };

  let body: string;
  try {
    body = JSON.stringify(payload);
  } catch (error) {
    console.error('Login JSON serialization failed:', error);
    return NextResponse.json(
      { success: false, error: 'Login response serialization failed' },
      { status: 500 },
    );
  }

  const response = new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

  try {
    response.cookies.set('token', token, getServerAuthCookieOptions(requestHost));
  } catch (error) {
    console.error('Login cookie failed (client session still set):', error);
  }

  return response;
}

function guardJson(
  status: number,
  error: string,
  state: LoginGuardState,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error,
      guard: state,
      ...extra,
    },
    { status },
  );
}

async function loginOnOrganizationHost(
  request: NextRequest,
  org: { id: number; name: string; slug: string },
  login: string,
  password: string,
  requestedSchoolId?: number,
) {
  const schools = await getSchoolsForOrganization(org.id);
  let schoolId = requestedSchoolId;

  if (schoolId == null || !Number.isFinite(schoolId)) {
    if (schools.length === 1) {
      schoolId = schools[0].id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Please select a school before signing in.' },
        { status: 400 },
      );
    }
  }

  const selectedSchool = schools.find((school) => school.id === schoolId);
  if (!selectedSchool) {
    return NextResponse.json({ success: false, error: 'Invalid school selected.' }, { status: 400 });
  }

  const { db, context } = await getRequestDb(request, schoolId, org.id);
  const tenant = context?.tenant ?? selectedSchool;

  const schoolResult = await authenticateUnifiedLogin(db, login, password, tenant);
  if (!('error' in schoolResult)) {
    clearLoginGuard(buildLoginGuardKey(request, login));
    return loginSuccessResponse(
      {
        user: schoolResult.user,
        token: schoolResult.token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          organization_id: tenant.organization_id,
        },
        organization: { id: org.id, name: org.name, slug: org.slug },
        schools: schools.map((school) => ({
          id: school.id,
          name: school.name,
          slug: school.slug,
          is_primary: school.is_primary ?? false,
          city: school.city ?? null,
        })),
        activeSchool: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          is_primary: tenant.is_primary ?? false,
          city: tenant.city ?? null,
        },
        requires_school_selection: false,
      },
      schoolResult.token,
      request.headers.get('host'),
    );
  }

  if (schoolResult.status === 401) {
    const orgResult = await authenticateOrganizationLogin(org, login, password, {
      preferredSchoolId: schoolId,
    });
    if (!('error' in orgResult)) {
      clearLoginGuard(buildLoginGuardKey(request, login));
      return loginSuccessResponse(
        {
          user: orgResult.user,
          token: orgResult.token,
          organization: orgResult.organization,
          schools: orgResult.schools,
          activeSchool: orgResult.activeSchool,
          requires_school_selection: orgResult.requires_school_selection,
          tenant: orgResult.activeSchool
            ? {
                id: orgResult.activeSchool.id,
                name: orgResult.activeSchool.name,
                slug: orgResult.activeSchool.slug,
              }
            : null,
        },
        orgResult.token,
        request.headers.get('host'),
      );
    }
  }

  const failed = failLoginGuard(request, login);
  return guardJson(failed.status, failed.error, failed.state);
}

async function loginOnPlatformHost(
  request: NextRequest,
  schoolCode: string,
  login: string,
  password: string,
  requestedSchoolId?: number,
) {
  const lookup = await resolveSchoolCodeLookup(schoolCode);
  if (!lookup) {
    return NextResponse.json(
      { success: false, error: 'No school found for this code. Please check and try again.' },
      { status: 404 },
    );
  }

  let schoolId = requestedSchoolId;
  if (schoolId == null || !Number.isFinite(schoolId)) {
    if (lookup.schools.length === 1) {
      schoolId = lookup.schools[0].id;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Please select a school before signing in.',
          requires_school_selection: true,
        },
        { status: 400 },
      );
    }
  }

  if (!schoolBelongsToLookup(lookup, schoolId)) {
    return NextResponse.json(
      { success: false, error: 'Selected school does not belong to this school code.' },
      { status: 403 },
    );
  }

  const org = lookup.organization;
  const selectedSchool = lookup.schools.find((school) => school.id === schoolId);
  if (!selectedSchool) {
    return NextResponse.json({ success: false, error: 'Invalid school selected.' }, { status: 400 });
  }

  const { db, context } = await getRequestDb(request, schoolId, org?.id);
  const tenant = context?.tenant ?? selectedSchool;
  const tenantForAuth = { ...tenant, school_code: lookup.school_code };

  const schoolResult = await authenticateUnifiedLogin(db, login, password, tenantForAuth);
  if (!('error' in schoolResult)) {
    clearLoginGuard(buildLoginGuardKey(request, login));
    return loginSuccessResponse(
      {
        user: schoolResult.user,
        token: schoolResult.token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          organization_id: tenant.organization_id,
        },
        organization: org
          ? { id: org.id, name: org.name, slug: org.slug, school_code: lookup.school_code }
          : null,
        school_code: lookup.school_code,
        schools: lookup.schools.map((school) => ({
          id: school.id,
          name: school.name,
          slug: school.slug,
          is_primary: school.is_primary ?? false,
          city: school.city ?? null,
        })),
        activeSchool: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          is_primary: tenant.is_primary ?? false,
          city: tenant.city ?? null,
        },
        requires_school_selection: false,
      },
      schoolResult.token,
      request.headers.get('host'),
    );
  }

  if (schoolResult.status === 401 && org) {
    const orgResult = await authenticateOrganizationLogin(org, login, password, {
      preferredSchoolId: schoolId,
    });
    if (!('error' in orgResult)) {
      if (
        orgResult.activeSchool &&
        !schoolBelongsToLookup(lookup, orgResult.activeSchool.id)
      ) {
        return NextResponse.json(
          { success: false, error: 'You do not have access to the selected school.' },
          { status: 403 },
        );
      }

      clearLoginGuard(buildLoginGuardKey(request, login));
      return loginSuccessResponse(
        {
          user: orgResult.user,
          token: orgResult.token,
          organization: { ...orgResult.organization, school_code: lookup.school_code },
          school_code: lookup.school_code,
          schools: orgResult.schools,
          activeSchool: orgResult.activeSchool,
          requires_school_selection: orgResult.requires_school_selection,
          tenant: orgResult.activeSchool
            ? {
                id: orgResult.activeSchool.id,
                name: orgResult.activeSchool.name,
                slug: orgResult.activeSchool.slug,
              }
            : null,
        },
        orgResult.token,
        request.headers.get('host'),
      );
    }
  }

  const failed = failLoginGuard(request, login);
  return guardJson(failed.status, failed.error, failed.state);
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body.login ?? body.email ?? body.user_id ?? '').trim();
    const password = String(body.password ?? '');
    const turnstileToken = String(body.turnstile_token ?? body.turnstileToken ?? '').trim() || undefined;
    const host = request.headers.get('host');
    const requestedSchoolId = parseInt(String(body.school_id ?? body.tenant_id ?? ''), 10);
    const schoolId = Number.isFinite(requestedSchoolId) ? requestedSchoolId : undefined;

    const guardCheck = await enforceLoginGuard(request, login, turnstileToken);
    if (!guardCheck.ok) {
      const { status, error, state } = guardCheck.response;
      return guardJson(status, error, state);
    }

    const hostCtx = await resolveHostContext(host);
    const subdomain = extractSubdomain(host);
    const isPlatformHost =
      !hostCtx.isSchoolHost && !hostCtx.isOrganizationHost && !subdomain;
    const schoolCode = String(body.school_code ?? body.schoolCode ?? '').trim();

    if (hostCtx.isOrganizationHost && hostCtx.organizationContext) {
      return loginOnOrganizationHost(
        request,
        hostCtx.organizationContext.organization,
        login,
        password,
        schoolId,
      );
    }

    const orgFromHost = await resolveOrganizationFromHost(host);
    if (orgFromHost && !hostCtx.isSchoolHost) {
      return loginOnOrganizationHost(request, orgFromHost, login, password, schoolId);
    }

    if (isPlatformHost) {
      if (!schoolCode) {
        return NextResponse.json(
          { success: false, error: 'School code is required.' },
          { status: 400 },
        );
      }
      return loginOnPlatformHost(request, schoolCode, login, password, schoolId);
    }

    const { db, context } = await getRequestDb(request);
    const result = await authenticateUnifiedLogin(
      db,
      login,
      password,
      context?.tenant ?? null,
    );

    if ('error' in result) {
      const tenant = context?.tenant;
      if (result.status === 401 && tenant?.organization_id && tenant.id) {
        const organization = await getOrganizationById(tenant.organization_id);
        if (organization) {
          const orgResult = await authenticateOrganizationLogin(
            organization,
            login,
            password,
            { preferredSchoolId: tenant.id },
          );
          if (!('error' in orgResult)) {
            clearLoginGuard(buildLoginGuardKey(request, login));
            return loginSuccessResponse(
              {
                user: orgResult.user,
                token: orgResult.token,
                organization: orgResult.organization,
                schools: orgResult.schools,
                activeSchool: orgResult.activeSchool,
                requires_school_selection: orgResult.requires_school_selection,
                tenant: orgResult.activeSchool
                  ? {
                      id: orgResult.activeSchool.id,
                      name: orgResult.activeSchool.name,
                      slug: orgResult.activeSchool.slug,
                    }
                  : null,
              },
              orgResult.token,
              request.headers.get('host'),
            );
          }
        }
      }

      const failed = failLoginGuard(request, login);
      return guardJson(failed.status, failed.error, failed.state);
    }

    clearLoginGuard(buildLoginGuardKey(request, login));
    return loginSuccessResponse(
      {
        user: result.user,
        token: result.token,
        tenant: context
          ? {
              id: context.tenant.id,
              name: context.tenant.name,
              slug: context.tenant.slug,
              organization_id: context.tenant.organization_id,
            }
          : null,
      },
      result.token,
      request.headers.get('host'),
    );
  } catch (error) {
    if (error instanceof TenantResolutionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('Login error:', error);
    const message =
      error instanceof Error && process.env.NODE_ENV !== 'production'
        ? error.message
        : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
