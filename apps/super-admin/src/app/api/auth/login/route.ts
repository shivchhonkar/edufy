import { NextRequest, NextResponse } from 'next/server';
import { authenticateUnifiedLogin } from '@/lib/authenticate-login';
import { getRequestDb, TenantResolutionError } from '@/lib/request-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body.login ?? body.email ?? body.user_id ?? '').trim();
    const password = String(body.password ?? '');

    const { db, context } = await getRequestDb(request);
    const result = await authenticateUnifiedLogin(
      db,
      login,
      password,
      context?.tenant ?? null,
    );

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        tenant: context
          ? { id: context.tenant.id, name: context.tenant.name, slug: context.tenant.slug }
          : null,
      },
      message: 'Login successful',
    });
  } catch (error) {
    if (error instanceof TenantResolutionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
