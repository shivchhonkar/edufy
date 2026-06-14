import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import bcrypt from 'bcryptjs';

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const userId = params.id;
    const body = await request.json();
    const { name, email, username, password, role, status, phone } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email is taken by another user
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Build update query
    let updateSql = `UPDATE users SET 
      email = $1, 
      full_name = $2, 
      role = $3, 
      is_active = $4,
      phone = $5,
      updated_at = NOW()`;
    
    const updateParams = [email, name, role || 'student', status === 'active', phone || ''];

    // Add password update if provided
    if (password && password.trim() !== '') {
      const password_hash = await bcrypt.hash(password, 10);
      updateSql += `, password_hash = $6 WHERE id = $7`;
      updateParams.push(password_hash, userId);
    } else {
      updateSql += ` WHERE id = $6`;
      updateParams.push(userId);
    }

    updateSql += ` RETURNING id, email, full_name as name, role, phone, is_active as status, created_at, updated_at`;

    const result = await db.query(updateSql, updateParams);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = {
      ...result.rows[0],
      username: result.rows[0].email.split('@')[0],
      status: result.rows[0].status ? 'active' : 'inactive'
    };

    return NextResponse.json({
      success: true,
      data: updatedUser
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    
    // Check if error is due to invalid role constraint
    if (error.message.includes('violates check constraint')) {
      return NextResponse.json(
        { success: false, error: 'Invalid role selected. Please choose a valid role from the dropdown.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const userId = params.id;

    // Check if user exists and get their role
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

    // Prevent deletion of super admin accounts
    if (user.role === 'super_admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete Super Admin account "${user.full_name}". Super Admin accounts are protected and cannot be deleted for security reasons.` 
        },
        { status: 403 }
      );
    }

    // Delete the user
    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

