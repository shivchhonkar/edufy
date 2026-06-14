import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// PUT - Update user status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const userId = params.id;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Check if user is super admin
    const userCheck = await db.query(
      'SELECT id, role, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userCheck.rows[0];

    // Prevent deactivation of super admin accounts
    if (user.role === 'super_admin' && status === 'inactive') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot deactivate Super Admin account "${user.full_name}". Super Admin accounts must remain active for security reasons.` 
        },
        { status: 403 }
      );
    }

    const isActive = status === 'active';

    const result = await db.query(
      `UPDATE users 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, full_name as name, role, is_active as status`,
      [isActive, userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        status: result.rows[0].status ? 'active' : 'inactive'
      }
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

