import type { RequestDb } from '@/lib/request-db';

export async function ensureTransportSchema(db: RequestDb) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      vehicle_number VARCHAR(50) UNIQUE NOT NULL,
      vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('bus', 'van', 'car')),
      model VARCHAR(100),
      capacity INTEGER NOT NULL,
      registration_date DATE,
      insurance_expiry DATE,
      pollution_certificate_expiry DATE,
      fitness_certificate_expiry DATE,
      owner_name VARCHAR(255),
      owner_phone VARCHAR(20),
      driver_name VARCHAR(255),
      driver_phone VARCHAR(20),
      driver_license VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      route_name VARCHAR(255) NOT NULL,
      route_number VARCHAR(50) UNIQUE,
      starting_point VARCHAR(255),
      ending_point VARCHAR(255),
      total_distance DECIMAL(10, 2),
      estimated_time INTEGER,
      monthly_fee DECIMAL(10, 2),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS route_stops (
      id SERIAL PRIMARY KEY,
      route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
      stop_name VARCHAR(255) NOT NULL,
      stop_order INTEGER NOT NULL,
      arrival_time TIME,
      pickup_fee DECIMAL(10, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicle_assignments (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER REFERENCES vehicles(id),
      driver_id INTEGER,
      route_id INTEGER REFERENCES routes(id),
      assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
      shift VARCHAR(20) DEFAULT 'both',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_transport (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      route_id INTEGER REFERENCES routes(id),
      stop_id INTEGER REFERENCES route_stops(id),
      transport_fee DECIMAL(10, 2),
      start_date DATE NOT NULL,
      end_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE routes ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10, 2);
    ALTER TABLE routes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE student_transport ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10, 2);
  `);
}
