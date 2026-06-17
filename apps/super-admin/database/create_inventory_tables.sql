-- Create Inventory Categories Table
CREATE TABLE IF NOT EXISTS inventory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES inventory_categories(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(100) UNIQUE,
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

-- Create Inventory Sales Table
CREATE TABLE IF NOT EXISTS inventory_sales (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    student_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(50) DEFAULT 'completed',
    remarks TEXT,
    sold_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Inventory Transactions Table (for stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment', 'sale', 'return'
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2),
    reference_type VARCHAR(50), -- 'sale', 'purchase', 'adjustment', etc.
    reference_id INTEGER,
    remarks TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_sales_item ON inventory_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sales_student ON inventory_sales(student_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sales_date ON inventory_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_inventory_categories_updated_at
    BEFORE UPDATE ON inventory_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

-- Insert some default categories (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Uniforms') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Uniforms', 'School uniforms and related items');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Footwear') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Footwear', 'School shoes and sports shoes');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Books') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Books', 'Textbooks and reference books');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Stationery') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Stationery', 'Notebooks, pens, pencils, and other stationery items');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Bags') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Bags', 'School bags, lunch boxes, and water bottles');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM inventory_categories WHERE name = 'Sports') THEN
        INSERT INTO inventory_categories (name, description) VALUES ('Sports', 'Sports equipment and accessories');
    END IF;
END $$;

-- Display summary
SELECT 'Inventory tables created successfully!' as status;
SELECT 'Categories:' as info, COUNT(*) as count FROM inventory_categories;
SELECT 'Items:' as info, COUNT(*) as count FROM inventory_items;

