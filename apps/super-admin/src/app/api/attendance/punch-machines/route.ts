import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// GET all punch machines
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let queryText = `
      SELECT 
        pm.*,
        COUNT(pml.id) as total_punches,
        MAX(pml.punch_time) as last_punch_time
      FROM punch_machines pm
      LEFT JOIN punch_machine_logs pml ON pm.device_id = pml.device_id
    `;
    let queryParams: any[] = [];

    if (status) {
      queryText += ' WHERE pm.status = $1';
      queryParams.push(status);
    }

    queryText += ' GROUP BY pm.id ORDER BY pm.created_at DESC';

    const result = await db.query(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching punch machines:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch punch machines' },
      { status: 500 }
    );
  }
}

// POST create new punch machine
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      device_id,
      device_name,
      location,
      device_type,
      ip_address,
      port,
      status,
    } = body;

    // Validation
    if (!device_id || !device_name || !location) {
      return NextResponse.json(
        { success: false, error: 'Device ID, Device Name, and Location are required' },
        { status: 400 }
      );
    }

    // Check if device ID already exists
    const existingDevice = await db.query(
      'SELECT id FROM punch_machines WHERE device_id = $1',
      [device_id]
    );

    if (existingDevice.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Device ID already exists' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO punch_machines (
        device_id, device_name, location, device_type, ip_address, port, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        device_id,
        device_name,
        location,
        device_type || 'fingerprint',
        ip_address,
        port,
        status || 'active',
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Punch machine added successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating punch machine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create punch machine' },
      { status: 500 }
    );
  }
}

// PUT update punch machine
export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      id,
      device_id,
      device_name,
      location,
      device_type,
      ip_address,
      port,
      status,
    } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE punch_machines SET 
        device_id = $1,
        device_name = $2,
        location = $3,
        device_type = $4,
        ip_address = $5,
        port = $6,
        status = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [
        device_id,
        device_name,
        location,
        device_type,
        ip_address,
        port,
        status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Punch machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Punch machine updated successfully',
    });
  } catch (error) {
    console.error('Error updating punch machine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update punch machine' },
      { status: 500 }
    );
  }
}

// DELETE punch machine
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // Check if machine has any logs
    const logsResult = await db.query(
      'SELECT COUNT(*) as count FROM punch_machine_logs WHERE device_id = (SELECT device_id FROM punch_machines WHERE id = $1)',
      [id]
    );

    if (parseInt(logsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete punch machine with existing logs. Archive it instead.' },
        { status: 400 }
      );
    }

    const result = await db.query(
      'DELETE FROM punch_machines WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Punch machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Punch machine deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting punch machine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete punch machine' },
      { status: 500 }
    );
  }
}








