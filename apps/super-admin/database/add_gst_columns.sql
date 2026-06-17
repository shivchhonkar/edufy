-- Add GST and HSN columns to existing inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) DEFAULT 18.00;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);

-- Update existing items to have default GST if null
UPDATE inventory_items 
SET gst_percentage = 18.00 
WHERE gst_percentage IS NULL;

-- Display confirmation
SELECT 'GST columns added successfully!' as status;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
AND column_name IN ('gst_percentage', 'hsn_code');

























































