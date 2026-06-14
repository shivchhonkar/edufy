import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import bcrypt from 'bcryptjs';

// POST - Reset user password
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const userId = params.id;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password is required' },
        { status: 400 }
      );
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update the password
    const result = await db.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, full_name as name`,
      [password_hash, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




