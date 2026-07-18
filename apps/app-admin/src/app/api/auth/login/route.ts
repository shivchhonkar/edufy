import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken } from '@edulakhya/auth';
import { createControlPool } from '@/lib/platform-db-config';
import { getServerAuthCookieOptions } from '@/lib/auth-cookie';
import { PLATFORM_ADMIN_ROLE } from '@/lib/platform-auth';
import { jsonError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? body.login ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return jsonError('Email and password are required', 400);
    }

    const pool = createControlPool();
    try {
      const result = await pool.query<{
        id: number;
        email: string;
        password_hash: string;
        full_name: string;
        is_active: boolean;
      }>(
        `SELECT id, email, password_hash, full_name, is_active
         FROM platform_admins
         WHERE LOWER(email) = $1
         LIMIT 1`,
        [email],
      );

      const admin = result.rows[0];
      if (!admin || !admin.is_active) {
        return jsonError('Invalid email or password', 401);
      }

      const valid = await verifyPassword(password, admin.password_hash);
      if (!valid) {
        return jsonError('Invalid email or password', 401);
      }

      const token = generateToken({
        id: admin.id,
        email: admin.email,
        role: PLATFORM_ADMIN_ROLE,
        full_name: admin.full_name,
      });

      const payload = {
        success: true,
        data: {
          token,
          user: {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            role: PLATFORM_ADMIN_ROLE,
          },
        },
        message: 'Login successful',
      };

      const response = new NextResponse(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
      response.cookies.set('token', token, getServerAuthCookieOptions());
      return response;
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error('Platform admin login error:', error);
    return jsonError('Internal server error', 500);
  }
}
