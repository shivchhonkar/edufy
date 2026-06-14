import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { fetchChildrenByIds, resolveParentStudentIds } from '@/lib/parent-students';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    const studentIds = await resolveParentStudentIds(phone);
    if (studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials - No students linked to this phone number' },
        { status: 401 }
      );
    }

    const isValidPassword = password === 'parent123' || password === 'demo123';
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid password. Use "parent123" or "demo123"' },
        { status: 401 }
      );
    }

    const children = await fetchChildrenByIds(studentIds);

    const token = jwt.sign(
      {
        phone,
        studentIds: children.map((c: { id: number }) => c.id),
        role: 'parent',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        phone,
        children,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: `An error occurred during login: ${message}` },
      { status: 500 }
    );
  }
}
