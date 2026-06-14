import { NextRequest, NextResponse } from 'next/server';
import { registerSchool } from '@/lib/platform-school-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_name,
      slug,
      admin_name,
      admin_email,
      admin_password,
      admin_phone,
      primary_color,
      academic_year_name,
      academic_year_start,
      academic_year_end,
    } = body;

    if (!school_name?.trim() || !slug?.trim() || !admin_name?.trim() || !admin_email?.trim() || !admin_password) {
      return NextResponse.json(
        { success: false, error: 'School name, slug, admin name, email, and password are required' },
        { status: 400 }
      );
    }

    if (admin_password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const result = await registerSchool({
      school_name: school_name.trim(),
      slug: slug.trim().toLowerCase(),
      admin_name: admin_name.trim(),
      admin_email: admin_email.trim().toLowerCase(),
      admin_password,
      admin_phone: admin_phone?.trim(),
      primary_color,
      academic_year_name: academic_year_name?.trim(),
      academic_year_start: academic_year_start?.trim(),
      academic_year_end: academic_year_end?.trim(),
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'School registered successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('School registration error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
