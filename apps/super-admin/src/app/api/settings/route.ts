import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings } from '@/lib/ensure-system-settings';

// GET - Fetch system settings
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);
    const result = await db.query(
      `SELECT * FROM system_settings ORDER BY id DESC LIMIT 1`,
      []
    );

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        data: {
          school_name: '',
          school_address: '',
          school_phone: '',
          school_email: '',
          academic_year: '',
          currency: 'INR',
          date_format: 'DD/MM/YYYY',
          timezone: 'Asia/Kolkata',
          late_fee_percentage: 2,
          late_fee_days: 7,
          auto_assign_fees: true,
          send_notifications: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching system settings:', error);
    
    // If table doesn't exist, return default settings
    if (error.message.includes('does not exist')) {
      return NextResponse.json({
        success: true,
        data: {
          school_name: '',
          school_address: '',
          school_phone: '',
          school_email: '',
          academic_year: '',
          currency: 'INR',
          date_format: 'DD/MM/YYYY',
          timezone: 'Asia/Kolkata',
          late_fee_percentage: 2,
          late_fee_days: 7,
          auto_assign_fees: true,
          send_notifications: true
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update system settings
export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);
    const body = await request.json();
    const {
      school_name,
      school_address,
      school_phone,
      school_email,
      academic_year,
      currency,
      date_format,
      timezone,
      late_fee_percentage,
      late_fee_days,
      auto_assign_fees,
      send_notifications
    } = body;

    // Always read/update the latest settings row (matches GET).
    const existing = await db.query(
      'SELECT id FROM system_settings ORDER BY id DESC LIMIT 1',
      [],
    );

    let result;
    
    if (existing.rows.length === 0) {
      // Insert new settings
      result = await db.query(
        `INSERT INTO system_settings (
          school_name, school_address, school_phone, school_email,
          academic_year, currency, date_format, timezone,
          late_fee_percentage, late_fee_days, auto_assign_fees, send_notifications,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          school_name, school_address, school_phone, school_email,
          academic_year, currency, date_format, timezone,
          late_fee_percentage, late_fee_days, auto_assign_fees, send_notifications
        ]
      );
    } else {
      // Update existing settings
      result = await db.query(
        `UPDATE system_settings SET
          school_name = $1,
          school_address = $2,
          school_phone = $3,
          school_email = $4,
          academic_year = $5,
          currency = $6,
          date_format = $7,
          timezone = $8,
          late_fee_percentage = $9,
          late_fee_days = $10,
          auto_assign_fees = $11,
          send_notifications = $12,
          updated_at = NOW()
        WHERE id = $13
        RETURNING *`,
        [
          school_name, school_address, school_phone, school_email,
          academic_year, currency, date_format, timezone,
          late_fee_percentage, late_fee_days, auto_assign_fees, send_notifications,
          existing.rows[0].id
        ]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error saving system settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




