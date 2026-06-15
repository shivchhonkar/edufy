import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb, TenantResolutionError } from '@/lib/request-db';
import { verifyPassword, generateToken } from '@edulakhya/auth';
import type { User } from '@edulakhya/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { db, context } = await getRequestDb(request);

    const result = await db.query<User>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const isPasswordValid = await verifyPassword(
      password,
      user.password_hash as string
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const tokenPayload: Parameters<typeof generateToken>[0] = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };
    if (context?.tenant) {
      tokenPayload.tenant_id = context.tenant.id;
      tokenPayload.tenant_slug = context.tenant.slug;
    }
    const token = generateToken(tokenPayload);

    const { password_hash: _p, ...userWithoutPassword } = user as User & { password_hash?: string };

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        tenant: context ? { id: context.tenant.id, name: context.tenant.name, slug: context.tenant.slug } : null,
      },
      message: 'Login successful',
    });
  } catch (error) {
    if (error instanceof TenantResolutionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
