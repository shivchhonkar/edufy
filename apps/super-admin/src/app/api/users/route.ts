import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import bcrypt from 'bcryptjs';

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let sql = `SELECT id, email, full_name as name, role, phone, is_active as status, 
               email as username, created_at, updated_at 
               FROM users WHERE 1=1`;
    const params: any[] = [];

    if (role && role !== 'all') {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await db.query(sql, params);

    // Format the data to match frontend expectations
    const users = result.rows.map(user => ({
      ...user,
      username: user.email.split('@')[0], // Use email prefix as username
      status: user.status ? 'active' : 'inactive'
    }));

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { name, email, username, password, role, status, phone } = body;

    // Validate required fields
    if (!name || !email || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, username, and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, full_name as name, role, phone, is_active as status, created_at, updated_at`,
      [email, password_hash, role || 'student', name, phone || '', status === 'active']
    );

    const newUser = {
      ...result.rows[0],
      username: result.rows[0].email.split('@')[0],
      status: result.rows[0].status ? 'active' : 'inactive'
    };

    return NextResponse.json({
      success: true,
      data: newUser
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
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

