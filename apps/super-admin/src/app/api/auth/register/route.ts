import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { hashPassword, generateToken } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { email, password, role, full_name, phone } = body;

    // Validation
    if (!email || !password || !role || !full_name) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, full_name, phone, is_active, created_at`,
      [email, passwordHash, role, full_name, phone || null, true]
    );

    const newUser = result.rows[0];

    // Generate token
    const token = generateToken(newUser);

    return NextResponse.json({
      success: true,
      data: {
        user: newUser,
        token,
      },
      message: 'User registered successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


