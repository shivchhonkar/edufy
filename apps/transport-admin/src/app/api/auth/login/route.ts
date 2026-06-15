import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';
import { verifyPassword, generateToken } from '@edulakhya/auth';

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

    // Find user by email
    const result = await query(
      `SELECT * FROM users 
       WHERE email = $1 
       AND is_active = true 
       AND (role = 'transport_manager' OR role = 'admin' OR role = 'super_admin')`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or unauthorized access' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await verifyPassword(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user has required role
    if (user.role !== 'transport_manager' && user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to access this system' },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


























































