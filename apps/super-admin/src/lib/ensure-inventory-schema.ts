import type { RequestDb } from '@/lib/request-db';

export async function ensureInventorySchema(db: RequestDb) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_units (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      remarks TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      contact_person VARCHAR(150),
      phone VARCHAR(30),
      email VARCHAR(150),
      address TEXT,
      gstin VARCHAR(30),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      remarks TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES inventory_categories(id) ON DELETE SET NULL,
      item_name VARCHAR(255) NOT NULL,
      item_code VARCHAR(100),
      description TEXT,
      unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
      quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER,
      unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      gst_percentage DECIMAL(5, 2) DEFAULT 18.00,
      hsn_code VARCHAR(20),
      supplier_name VARCHAR(255),
      supplier_contact VARCHAR(50),
      location VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) DEFAULT 18.00;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS vendor_id INTEGER;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_id INTEGER;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(80);
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_asset BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_qty INTEGER;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS size VARCHAR(40);

    CREATE TABLE IF NOT EXISTS inventory_stock (
      item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      location_id INTEGER NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (item_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
      transaction_type VARCHAR(50) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10, 2),
      reference_type VARCHAR(50),
      reference_id INTEGER,
      remarks TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
    ALTER TABLE inventory_transactions ALTER COLUMN transaction_type TYPE VARCHAR(50);
    ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
    ALTER TABLE inventory_transactions ALTER COLUMN transaction_type TYPE VARCHAR(50);
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS reference_id INTEGER;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS created_by INTEGER;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS transaction_date DATE;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS issued_to_type VARCHAR(50);
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS issued_to_id INTEGER;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS issued_to_name VARCHAR(200);
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2);
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS location_id INTEGER;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS to_location_id INTEGER;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS qty_before INTEGER;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS qty_after INTEGER;

    ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE inventory_locations ADD COLUMN IF NOT EXISTS remarks TEXT;

    CREATE TABLE IF NOT EXISTS inventory_docs (
      id SERIAL PRIMARY KEY,
      kind VARCHAR(30) NOT NULL,
      doc_no VARCHAR(40) NOT NULL,
      doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      vendor_id INTEGER REFERENCES inventory_vendors(id) ON DELETE SET NULL,
      location_id INTEGER REFERENCES inventory_locations(id) ON DELETE SET NULL,
      to_location_id INTEGER REFERENCES inventory_locations(id) ON DELETE SET NULL,
      source_doc_id INTEGER,
      party_type VARCHAR(30),
      party_id INTEGER,
      party_name VARCHAR(200),
      remarks TEXT,
      created_by INTEGER,
      posted_by INTEGER,
      posted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_doc_lines (
      id SERIAL PRIMARY KEY,
      doc_id INTEGER NOT NULL REFERENCES inventory_docs(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
      quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
      counted_qty NUMERIC(12, 2),
      unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_assets (
      id SERIAL PRIMARY KEY,
      item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
      asset_tag VARCHAR(80) NOT NULL,
      serial_no VARCHAR(80),
      status VARCHAR(20) NOT NULL DEFAULT 'in_store',
      location_id INTEGER REFERENCES inventory_locations(id) ON DELETE SET NULL,
      purchase_date DATE,
      purchase_value DECIMAL(12, 2),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_asset_assignments (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER NOT NULL REFERENCES inventory_assets(id) ON DELETE CASCADE,
      party_type VARCHAR(30) NOT NULL,
      party_id INTEGER,
      party_name VARCHAR(200) NOT NULL,
      assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
      returned_at DATE,
      remarks TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      user_name VARCHAR(150),
      action VARCHAR(40) NOT NULL,
      entity VARCHAR(40) NOT NULL,
      entity_id INTEGER,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(item_code);
    CREATE INDEX IF NOT EXISTS idx_inventory_docs_kind ON inventory_docs(kind, status, doc_date);
    CREATE INDEX IF NOT EXISTS idx_inventory_doc_lines_doc ON inventory_doc_lines(doc_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_tx_item ON inventory_transactions(item_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_inventory_audit_created ON inventory_audit_log(created_at DESC);
  `);

  try {
    await db.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'inventory_transactions'
            AND con.contype = 'c'
            AND pg_get_constraintdef(con.oid) ILIKE '%transaction_type%'
        LOOP
          EXECUTE format('ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS %I', r.conname);
        END LOOP;
      END $$;
    `);
  } catch {
    // Ignore if the check constraint was already removed.
  }

  try {
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_item_code_key
       ON inventory_items (item_code)
       WHERE item_code IS NOT NULL AND item_code <> ''`
    );
  } catch {
    // Skip if duplicate codes already exist.
  }

  const units = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM inventory_units`);
  if (parseInt(units.rows[0]?.count || '0', 10) === 0) {
    await db.query(
      `INSERT INTO inventory_units (name) VALUES ('pcs'), ('box'), ('set'), ('kg'), ('ltr'), ('mtr'), ('pair')`
    );
  }

  const locations = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM inventory_locations`);
  if (parseInt(locations.rows[0]?.count || '0', 10) === 0) {
    await db.query(`INSERT INTO inventory_locations (name, remarks) VALUES ('Main Store', 'Default store')`);
  }

  const cats = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM inventory_categories`);
  if (parseInt(cats.rows[0]?.count || '0', 10) === 0) {
    await db.query(
      `INSERT INTO inventory_categories (name, description) VALUES
        ('Uniforms', 'School uniforms'),
        ('Stationery', 'Notebooks, pens and classroom supplies'),
        ('Sports', 'Sports equipment'),
        ('Furniture', 'Furniture and fixtures'),
        ('IT Equipment', 'Computers and peripherals'),
        ('Lab', 'Science and computer lab material')`
    );
  }

  await db.query(`
    INSERT INTO inventory_stock (item_id, location_id, quantity)
    SELECT i.id, l.id, COALESCE(i.quantity, 0)
    FROM inventory_items i
    CROSS JOIN (SELECT id FROM inventory_locations ORDER BY id LIMIT 1) l
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_stock s WHERE s.item_id = i.id
    )
  `);
}
