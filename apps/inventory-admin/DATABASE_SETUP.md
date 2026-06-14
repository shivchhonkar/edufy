# 🗄️ Inventory Database Setup

## ⚠️ Important: Database Tables Missing

The inventory tables don't exist in your database yet. That's why the items API is returning an empty array even after successful bulk upload.

## ✅ Quick Fix - Run This Command

### Option 1: Using Batch File (Easiest)
```bash
cd database
setup-inventory-tables.bat
```

### Option 2: Using psql Directly
```bash
cd database
psql "postgresql://username:password@localhost:5432/database_name" -f create_inventory_tables.sql
```

Replace the connection string with your actual database credentials.

## 📋 What Will Be Created

### Tables
1. **inventory_categories** - Product categories (Uniforms, Books, etc.)
2. **inventory_items** - All inventory items with GST support
3. **inventory_sales** - Sales records with GST calculation
4. **inventory_transactions** - Stock movement tracking

### Default Categories
The script automatically creates 6 default categories:
- ✅ Uniforms
- ✅ Footwear  
- ✅ Books
- ✅ Stationery
- ✅ Bags
- ✅ Sports

### Features Included
- ✅ GST percentage field (0%, 5%, 12%, 18%, 28%)
- ✅ HSN/SAC code field for tax compliance
- ✅ Stock level tracking
- ✅ Supplier information
- ✅ Automatic timestamps
- ✅ Indexes for performance

## 🚀 After Setup

1. **Verify tables exist:**
   ```sql
   \dt inventory*
   ```

2. **Check categories:**
   ```sql
   SELECT * FROM inventory_categories;
   ```

3. **Upload sample data:**
   - Go to `http://localhost:3004/items`
   - Click "📤 Bulk Upload"
   - Upload `sample_inventory_upload.csv` (50 items)

4. **Verify items:**
   ```sql
   SELECT COUNT(*) FROM inventory_items;
   ```

## 🔍 Troubleshooting

### Error: "psql: command not found"
**Solution:** Add PostgreSQL to your PATH or use full path:
```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" "your-connection-string" -f create_inventory_tables.sql
```

### Error: "permission denied"
**Solution:** Make sure your database user has CREATE TABLE permissions.

### Error: "database does not exist"
**Solution:** Create the database first:
```sql
CREATE DATABASE your_database_name;
```

## 📊 Table Schema Details

### inventory_items
```sql
- id (PRIMARY KEY)
- category_id (FOREIGN KEY)
- item_name (VARCHAR 255, NOT NULL)
- item_code (VARCHAR 100, UNIQUE)
- unit (VARCHAR 50, DEFAULT 'pcs')
- quantity (INTEGER, NOT NULL)
- unit_price (DECIMAL 10,2)
- gst_percentage (DECIMAL 5,2, DEFAULT 18.00)
- hsn_code (VARCHAR 20)
- supplier_name (VARCHAR 255)
- supplier_contact (VARCHAR 50)
- location (VARCHAR 255)
- created_at, updated_at
```

## ✨ What You Get After Setup

- ✅ 6 default categories ready to use
- ✅ Full GST support (0% to 28%)
- ✅ HSN/SAC codes for tax compliance
- ✅ Stock tracking with minimum levels
- ✅ Supplier management
- ✅ Sales tracking with GST breakdown
- ✅ Transaction history
- ✅ Ready to upload 50 sample items

---

**Need Help?** Check the console output after running the batch file for detailed error messages.

























































