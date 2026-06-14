import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { requireHrRead } from '@/lib/hr-auth';
import { classNameOrderSql } from '@/lib/class-sort';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    const exportType = params.type;
    let csvData = '';
    let filename = '';

    switch (exportType) {
      case 'students':
        const studentsResult = await db.query(
          `SELECT s.*, c.name as class_name, sec.name as section_name
           FROM students s
           LEFT JOIN classes c ON s.class_id = c.id
           LEFT JOIN sections sec ON s.section_id = sec.id
           ORDER BY s.first_name, s.last_name`,
          []
        );
        
        csvData = convertToCSV(studentsResult.rows, [
          'id', 'admission_number', 'first_name', 'last_name', 'class_name', 
          'section_name', 'parent_name', 'parent_phone', 'status'
        ]);
        filename = 'students_export';
        break;

      case 'fees':
        const feesResult = await db.query(
          `SELECT fs.*, c.name as class_name
           FROM fee_structures fs
           LEFT JOIN classes c ON fs.class_id = c.id
           ORDER BY ${classNameOrderSql('c.name', { nullsFirst: true, prioritizeNull: true })}, fs.fee_type`,
          []
        );
        
        csvData = convertToCSV(feesResult.rows, [
          'id', 'class_name', 'fee_type', 'amount', 'frequency', 
          'academic_year', 'is_active'
        ]);
        filename = 'fees_export';
        break;

      case 'payments':
        const paymentsResult = await db.query(
          `SELECT fp.*, s.first_name, s.last_name, s.admission_number
           FROM fee_payments fp
           JOIN students s ON fp.student_id = s.id
           ORDER BY fp.payment_date DESC`,
          []
        );
        
        csvData = convertToCSV(paymentsResult.rows, [
          'id', 'admission_number', 'first_name', 'last_name', 
          'amount_paid', 'payment_date', 'payment_method', 'status'
        ]);
        filename = 'payments_export';
        break;

      case 'staff':
        const staffResult = await db.query(
          `SELECT s.employee_id, s.first_name, s.last_name, s.phone, s.email,
            COALESCE(d.name, s.department) AS department,
            COALESCE(des.name, s.designation) AS designation,
            s.date_of_joining, s.salary, s.status
           FROM staff s
           LEFT JOIN departments d ON s.department_id = d.id
           LEFT JOIN designations des ON s.designation_id = des.id
           ORDER BY s.first_name, s.last_name`
        );
        csvData = convertToCSV(staffResult.rows, [
          'employee_id', 'first_name', 'last_name', 'phone', 'email',
          'department', 'designation', 'date_of_joining', 'salary', 'status'
        ]);
        filename = 'staff_export';
        break;

      case 'attendance':
        const attendanceResult = await db.query(
          `SELECT a.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
           FROM attendance a
           JOIN students s ON a.student_id = s.id
           LEFT JOIN classes c ON s.class_id = c.id
           ORDER BY a.date DESC`,
          []
        );
        
        csvData = convertToCSV(attendanceResult.rows, [
          'date', 'admission_number', 'first_name', 'last_name', 
          'class_name', 'status', 'remarks'
        ]);
        filename = 'attendance_export';
        break;

      case 'complete':
        csvData = '=== COMPLETE SYSTEM EXPORT ===\n\n';
        csvData += '--- STUDENTS ---\n';
        csvData += await exportStudentsCSV(db) + '\n\n';
        csvData += '--- FEE STRUCTURES ---\n';
        csvData += await exportFeesCSV(db) + '\n\n';
        csvData += '--- PAYMENTS ---\n';
        csvData += await exportPaymentsCSV(db);
        filename = 'complete_export';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid export type' },
          { status: 400 }
        );
    }

    // Return CSV file
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to convert rows to CSV
function convertToCSV(rows: any[], columns: string[]): string {
  if (rows.length === 0) return '';

  // Create header
  const header = columns.join(',');
  
  // Create rows
  const csvRows = rows.map(row => {
    return columns.map(column => {
      const value = row[column];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [header, ...csvRows].join('\n');
}

// Helper functions for complete export
async function exportStudentsCSV(db: Awaited<ReturnType<typeof getRequestDb>>['db']): Promise<string> {
  const result = await db.query(
    `SELECT s.*, c.name as class_name FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     ORDER BY s.first_name, s.last_name`,
    []
  );
  return convertToCSV(result.rows, [
    'id', 'admission_number', 'first_name', 'last_name', 'class_name', 'status'
  ]);
}

async function exportFeesCSV(db: Awaited<ReturnType<typeof getRequestDb>>['db']): Promise<string> {
  const result = await db.query(
    `SELECT fs.*, c.name as class_name FROM fee_structures fs
     LEFT JOIN classes c ON fs.class_id = c.id
     ORDER BY ${classNameOrderSql('c.name', { nullsFirst: true, prioritizeNull: true })}, fs.fee_type`,
    []
  );
  return convertToCSV(result.rows, [
    'id', 'class_name', 'fee_type', 'amount', 'frequency', 'is_active'
  ]);
}

async function exportPaymentsCSV(db: Awaited<ReturnType<typeof getRequestDb>>['db']): Promise<string> {
  const result = await db.query(
    `SELECT fp.*, s.first_name, s.last_name FROM fee_payments fp
     JOIN students s ON fp.student_id = s.id
     ORDER BY fp.payment_date DESC`,
    []
  );
  return convertToCSV(result.rows, [
    'id', 'first_name', 'last_name', 'amount_paid', 'payment_date', 'status'
  ]);
}




