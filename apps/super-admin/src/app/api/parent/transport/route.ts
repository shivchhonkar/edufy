import { NextRequest, NextResponse } from 'next/server';

import { getRequestDbOrError } from '@/lib/request-db';

import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

import { ensureTransportSchema } from '@/lib/ensure-transport-schema';



type StaffRole =

  | 'Bus Incharge'

  | 'Driver'

  | 'Conductor'

  | 'Care Taker'

  | 'Helper';



type TransportStaff = {

  role: StaffRole;

  name: string | null;

  phone: string | null;

  image_url: string | null;

};



type TripDetails = {

  route_name: string;

  route_number: string;

  vehicle_number: string | null;

  stop_name: string;

  staff: TransportStaff[];

};



type VehicleContacts = {
  owner_name: string | null;
  owner_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_license: string | null;
  has_dedicated_driver_phone: boolean;
};



function trimOrNull(value: unknown): string | null {

  if (value == null) return null;

  const trimmed = String(value).trim();

  return trimmed || null;

}



function formatClockTime(value: unknown): string {

  if (value == null || value === '') return '00:00';



  if (value instanceof Date) {

    const hours = String(value.getHours()).padStart(2, '0');

    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;

  }



  const raw = String(value);

  const isoMatch = raw.match(/T(\d{2}):(\d{2})/);

  if (isoMatch) {

    return `${isoMatch[1]}:${isoMatch[2]}`;

  }



  const parts = raw.split(':');

  if (parts.length < 2) return raw;

  const hours = parts[0]?.padStart(2, '0') ?? '00';

  const minutes = parts[1]?.padStart(2, '0') ?? '00';

  return `${hours}:${minutes}`;

}



function addMinutesToClockTime(timeValue: unknown, minutesToAdd: number): string {

  const base = formatClockTime(timeValue);

  if (base === '00:00' || minutesToAdd <= 0) return '00:00';



  const [hoursRaw, minutesRaw] = base.split(':');

  const hours = parseInt(hoursRaw, 10);

  const minutes = parseInt(minutesRaw, 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '00:00';



  const totalMinutes = hours * 60 + minutes + minutesToAdd;

  const nextHours = Math.floor(totalMinutes / 60) % 24;

  const nextMinutes = totalMinutes % 60;

  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;

}



function buildRouteLabel(routeNumber?: string | null, routeName?: string | null): string {

  const number = routeNumber?.trim();

  const name = routeName?.trim();

  if (number && name) return `${number}-${name}`.toUpperCase();

  return (name || number || 'BUS').toUpperCase();

}



function resolveVehicleContacts(row: Record<string, unknown>): VehicleContacts {
  const ownerName = trimOrNull(row.owner_name);
  const ownerPhone = trimOrNull(row.owner_phone);
  const rawDriverName = trimOrNull(row.driver_name);
  const rawDriverPhone = trimOrNull(row.driver_phone);
  const driverName = rawDriverName ?? ownerName;
  const driverPhone = rawDriverPhone ?? ownerPhone;

  return {
    owner_name: ownerName,
    owner_phone: ownerPhone,
    driver_name: driverName,
    driver_phone: driverPhone,
    driver_license: trimOrNull(row.driver_license),
    has_dedicated_driver_phone: Boolean(rawDriverPhone),
  };
}



function buildStaffList(contacts: VehicleContacts): TransportStaff[] {
  const roles: StaffRole[] = [
    'Bus Incharge',
    'Driver',
    'Conductor',
    'Care Taker',
    'Helper',
  ];

  const ownerIsDriver =
    contacts.owner_name != null &&
    contacts.driver_name != null &&
    contacts.owner_name.toLowerCase() === contacts.driver_name.toLowerCase() &&
    (contacts.owner_phone ?? '') === (contacts.driver_phone ?? '');

  const driverHasPhone = Boolean(contacts.driver_phone);

  return roles.map((role) => {
    if (role === 'Bus Incharge') {
      if (ownerIsDriver) {
        return { role, name: null, phone: null, image_url: null };
      }

      return {
        role,
        name: contacts.owner_name,
        phone: driverHasPhone ? null : contacts.owner_phone,
        image_url: null,
      };
    }

    if (role === 'Driver') {
      return {
        role,
        name: contacts.driver_name,
        phone: contacts.driver_phone,
        image_url: null,
      };
    }

    return {
      role,
      name: null,
      phone: null,
      image_url: null,
    };
  });
}



function buildTripDetails(

  row: Record<string, unknown>,

  stopName: string,

  contacts: VehicleContacts,

): TripDetails {

  const routeNumber = String(row.route_number ?? '—').trim() || '—';

  const vehicleNumber = trimOrNull(row.vehicle_number);



  return {

    route_name: buildRouteLabel(

      row.route_number as string | null | undefined,

      row.route_name as string | null | undefined,

    ),

    route_number: routeNumber,

    vehicle_number: vehicleNumber,

    stop_name: stopName,

    staff: buildStaffList(contacts),

  };

}



function resolvePickupTime(row: Record<string, unknown>): string {

  const pickupTime = formatClockTime(row.arrival_time);

  if (pickupTime !== '00:00') return pickupTime;

  return formatClockTime(row.route_first_stop_time);

}



function resolveDropOffTime(row: Record<string, unknown>): string {

  const lastStopTime = formatClockTime(row.route_last_stop_time);

  if (lastStopTime !== '00:00') return lastStopTime;



  const pickupTime = resolvePickupTime(row);

  if (pickupTime === '00:00') return '00:00';



  const estimatedMinutes = parseInt(String(row.estimated_time ?? 0), 10);

  if (Number.isFinite(estimatedMinutes) && estimatedMinutes > 0) {

    return addMinutesToClockTime(row.arrival_time ?? row.route_first_stop_time, estimatedMinutes);

  }



  return '00:00';

}



const TRANSPORT_QUERY = `

  SELECT st.id AS assignment_id,

         st.status,

         st.transport_fee,

         st.start_date,

         st.end_date,

         r.route_name,

         r.route_number,

         r.starting_point,

         r.ending_point,

         r.total_distance,

         r.estimated_time,

         rs.stop_name,

         rs.stop_order,

         rs.arrival_time,

         rs.pickup_fee,

         v.id AS vehicle_id,

         v.vehicle_number,

         v.vehicle_type,

         v.model,

         v.capacity,

         v.owner_name,

         v.owner_phone,

         v.driver_name,

         v.driver_phone,

         v.driver_license,

         va.shift,

         first_stop.arrival_time AS route_first_stop_time,

         last_stop.arrival_time AS route_last_stop_time,

         last_stop.stop_name AS route_end_stop_name

  FROM student_transport st

  JOIN routes r ON st.route_id = r.id

  LEFT JOIN route_stops rs ON st.stop_id = rs.id

  LEFT JOIN LATERAL (

    SELECT va.vehicle_id, va.shift

    FROM vehicle_assignments va

    WHERE va.route_id = st.route_id

    ORDER BY CASE WHEN va.status = 'active' THEN 0 ELSE 1 END,

             va.assigned_date DESC,

             va.id DESC

    LIMIT 1

  ) va ON true

  LEFT JOIN vehicles v ON v.id = va.vehicle_id

  LEFT JOIN LATERAL (

    SELECT arrival_time

    FROM route_stops

    WHERE route_id = st.route_id

    ORDER BY stop_order ASC, id ASC

    LIMIT 1

  ) first_stop ON true

  LEFT JOIN LATERAL (

    SELECT arrival_time, stop_name

    FROM route_stops

    WHERE route_id = st.route_id

    ORDER BY stop_order DESC, id DESC

    LIMIT 1

  ) last_stop ON true

  WHERE st.student_id = $1

  ORDER BY CASE WHEN st.status = 'active' THEN 0 ELSE 1 END, st.start_date DESC, st.id DESC

  LIMIT 1`;



/**

 * GET /api/parent/transport?studentId={id}

 *

 * Returns pickup/drop-off timings, route info, vehicle, and transport staff for the student.

 */

export async function GET(request: NextRequest) {

  try {

    const dbResult = await getRequestDbOrError(request);

    if (dbResult instanceof NextResponse) return dbResult;

    const { db } = dbResult;



    const authResult = requireStudentFromQuery(request);

    if (authResult instanceof NextResponse) return authResult;

    const { studentId } = authResult;



    await ensureTransportSchema(db);



    const assignmentResult = await db.query(TRANSPORT_QUERY, [studentId]);



    if (!assignmentResult.rows.length) {

      return NextResponse.json({

        success: true,

        data: {

          has_transport: false,

          pick_up_time: '00:00',

          drop_off_time: '00:00',

          pick_up_details: {

            route_name: '—',

            route_number: '—',

            vehicle_number: null,

            stop_name: '—',

            staff: buildStaffList({
              owner_name: null,
              owner_phone: null,
              driver_name: null,
              driver_phone: null,
              driver_license: null,
              has_dedicated_driver_phone: false,
            }),

          },

          drop_off_details: {

            route_name: '—',

            route_number: '—',

            vehicle_number: null,

            stop_name: '—',

            staff: buildStaffList({
              owner_name: null,
              owner_phone: null,
              driver_name: null,
              driver_phone: null,
              driver_license: null,
              has_dedicated_driver_phone: false,
            }),

          },

          vehicle: null,

          route: null,

        },

      });

    }



    const row = assignmentResult.rows[0];

    const contacts = resolveVehicleContacts(row);



    const pickupStop =

      String(row.stop_name ?? '').trim() ||

      String(row.starting_point ?? '').trim() ||

      '—';

    const dropOffStop =

      String(row.route_end_stop_name ?? '').trim() ||

      String(row.ending_point ?? '').trim() ||

      String(row.stop_name ?? '').trim() ||

      '—';



    const pickupTime = resolvePickupTime(row);

    const dropOffTime = resolveDropOffTime(row);



    const pickUpDetails = buildTripDetails(row, pickupStop, contacts);

    const dropOffDetails = buildTripDetails(row, dropOffStop, contacts);



    const vehicle = row.vehicle_id

      ? {

          id: row.vehicle_id,

          vehicle_number: row.vehicle_number,

          vehicle_type: row.vehicle_type,

          model: row.model,

          capacity: row.capacity,

          owner_name: contacts.owner_name,

          owner_phone: contacts.owner_phone,

          driver_name: contacts.driver_name,

          driver_phone: contacts.driver_phone,

          driver_license: contacts.driver_license,

          shift: row.shift,

        }

      : null;



    return NextResponse.json({

      success: true,

      data: {

        has_transport: true,

        pick_up_time: pickupTime,

        drop_off_time: dropOffTime,

        pick_up_details: pickUpDetails,

        drop_off_details: dropOffDetails,

        vehicle,

        route: {

          route_name: row.route_name,

          route_number: row.route_number,

          starting_point: row.starting_point,

          ending_point: row.ending_point,

          stop_name: row.stop_name,

          stop_order: row.stop_order,

          arrival_time: row.arrival_time,

          transport_fee: row.transport_fee,

          total_distance: row.total_distance,

          estimated_time: row.estimated_time,

          vehicle_number: row.vehicle_number,

          shift: row.shift,

          status: row.status,

          start_date: row.start_date,

          end_date: row.end_date,

        },

      },

    });

  } catch (error) {

    console.error('Error fetching parent transport details:', error);

    return NextResponse.json(

      { success: false, error: 'Failed to fetch transport details' },

      { status: 500 },

    );

  }

}

