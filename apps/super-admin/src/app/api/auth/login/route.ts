import { NextRequest, NextResponse } from 'next/server';
import { authenticateUnifiedLogin } from '@/lib/authenticate-login';
import {
  authenticateOrganizationLogin,
  resolveOrganizationFromHost,
} from '@/lib/org-auth';
import { getRequestDb, TenantResolutionError } from '@/lib/request-db';
import { resolveHostContext } from '@/lib/host-context';
import { getOrganizationById, getSchoolsForOrganization } from '@edulakhya/tenant';

function setLoginCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
  });
  return response;
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
    const response = NextResponse.json({
      success: true,
      data: {
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
      message: 'Login successful',
    });
    return setLoginCookie(response, schoolResult.token);
  }

  if (schoolResult.status === 401) {
    const orgResult = await authenticateOrganizationLogin(org, login, password, {
      preferredSchoolId: schoolId,
    });
    if (!('error' in orgResult)) {
      const response = NextResponse.json({
        success: true,
        data: {
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
        message: 'Login successful',
      });
      return setLoginCookie(response, orgResult.token);
    }
  }

  return NextResponse.json(
    { success: false, error: schoolResult.error },
    { status: schoolResult.status },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body.login ?? body.email ?? body.user_id ?? '').trim();
    const password = String(body.password ?? '');
    const host = request.headers.get('host');
    const requestedSchoolId = parseInt(String(body.school_id ?? body.tenant_id ?? ''), 10);
    const schoolId = Number.isFinite(requestedSchoolId) ? requestedSchoolId : undefined;

    const hostCtx = await resolveHostContext(host);

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
            const response = NextResponse.json({
              success: true,
              data: {
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
              message: 'Login successful',
            });
            return setLoginCookie(response, orgResult.token);
          }
        }
      }

      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const response = NextResponse.json({
      success: true,
      data: {
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
      message: 'Login successful',
    });
    return setLoginCookie(response, result.token);
  } catch (error) {
    if (error instanceof TenantResolutionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
