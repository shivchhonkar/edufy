import { NextRequest, NextResponse } from 'next/server';

const TEMPLATES: Record<string, { filename: string; content: string }> = {
  students: {
    filename: 'students_import_template.csv',
    content:
      'first_name,last_name,date_of_birth,gender,parent_name,parent_phone,parent_email,class_name,section_name,admission_date\n' +
      'Rahul,Sharma,2015-04-10,Male,Rajesh Sharma,9876543210,raj@email.com,Class 1,A,2026-04-01\n',
  },
  staff: {
    filename: 'staff_import_template.csv',
    content:
      'first_name,last_name,phone,email,gender,department,designation,date_of_joining,basic_salary\n' +
      'Priya,Verma,9876543211,priya@school.com,Female,Teaching,Teacher,2026-04-01,25000\n',
  },
};

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'students';
  const template = TEMPLATES[type];

  if (!template) {
    return NextResponse.json({ success: false, error: 'Unknown template type' }, { status: 400 });
  }

  return new NextResponse(template.content, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${template.filename}"`,
    },
  });
}
