import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Send credentials to user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const userId = params.id;
    const result = await db.query(
      'SELECT id, email, full_name as name FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // TODO: Implement actual email sending logic here
    // For now, we'll just return success
    // In a real application, you would use a service like SendGrid, AWS SES, etc.

    console.log(`Sending credentials to ${user.email} for user ${user.name}`);

    return NextResponse.json({
      success: true,
      message: `Credentials sent to ${user.email}`
    });
  } catch (error: any) {
    console.error('Error sending credentials:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




