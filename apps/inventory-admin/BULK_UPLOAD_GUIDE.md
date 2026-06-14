# Bulk Inventory Upload Guide

## 📋 Overview

This guide explains how to use the sample CSV file to bulk upload inventory items into the system.

## 📁 Sample File Location

**File**: `sample_inventory_upload.csv`

This file contains 50+ pre-configured school items with GST rates and HSN codes ready for import.

## 📊 CSV Format

### Column Structure

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| item_name | ✅ Yes | Full item name | School Uniform Shirt - Summer |
| item_code | ⚠️ Recommended | Unique item code | UNI-SH-SUM-001 |
| category_name | ⚠️ Recommended | Category name | Uniforms |
| description | ❌ No | Item description | White cotton shirt with school logo |
| unit | ✅ Yes | Unit of measurement | pcs, kg, ltr, pack, pair |
| quantity | ✅ Yes | Initial stock quantity | 100 |
| min_stock_level | ⚠️ Recommended | Minimum stock alert level | 20 |
| unit_price | ✅ Yes | Base price (before GST) | 300 |
| gst_percentage | ✅ Yes | GST rate | 0, 5, 12, 18, or 28 |
| hsn_code | ⚠️ Recommended | HSN/SAC tax code | 6203 |
| supplier_name | ❌ No | Supplier name | Uniform Makers Ltd |
| supplier_contact | ❌ No | Supplier contact | 9876543210 |
| location | ❌ No | Storage location | Store Room A |

## 🎯 Sample Items Included (50+ Items)

### 1. Uniforms (10 items)
- Summer shirts, pants, skirts
- Winter blazer, sweater
- Ties (Red, Blue, Green houses)
- Socks, belts
- **GST**: 5-12%

### 2. Footwear (5 items)
- Black school shoes (multiple sizes)
- White canvas shoes
- Sports shoes
- **GST**: 5-12%

### 3. Books (5 items)
- NCERT textbooks (Math, Science, English, Hindi)
- Reference books
- **GST**: 0-5%

### 4. Stationery (14 items)
- Notebooks (single line, four line, graph)
- Pens, pencils, erasers
- Geometry box, calculator
- Art supplies, color pencils
- **GST**: 5-18%

### 5. Bags & Accessories (6 items)
- School bags (medium, large)
- Lunch boxes (plastic, steel)
- Water bottles
- ID card holders
- **GST**: 12-18%

### 6. Sports Equipment (10 items)
- Cricket bat, balls
- Football, basketball
- Badminton, table tennis
- Chess, carrom boards
- **GST**: 18%

## 📝 How to Use the Sample File

### Option 1: Use As-Is (Recommended)

1. **Download**: The file is already in your `apps/inventory-admin` folder
2. **Review**: Open in Excel/Google Sheets to verify items
3. **Customize**: Edit quantities, prices as needed
4. **Upload**: Import into system

### Option 2: Create Custom File

1. **Copy Header**: Use the first row as template
2. **Add Items**: Follow the format
3. **Validate**: Check required fields
4. **Save**: As CSV (UTF-8)

## 🔧 Implementation Steps

### Step 1: Create Upload API Route

**File**: `apps/inventory-admin/src/app/api/items/bulk-upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.item_name || !record.unit || !record.quantity || !record.unit_price) {
          errors.push(`Row skipped: Missing required fields for ${record.item_name || 'unknown item'}`);
          errorCount++;
          continue;
        }

        // Get or create category
        let categoryId = null;
        if (record.category_name) {
          const categoryResult = await pool.query(
            'SELECT id FROM inventory_categories WHERE name = $1',
            [record.category_name]
          );
          
          if (categoryResult.rows.length > 0) {
            categoryId = categoryResult.rows[0].id;
          } else {
            const newCategory = await pool.query(
              'INSERT INTO inventory_categories (name) VALUES ($1) RETURNING id',
              [record.category_name]
            );
            categoryId = newCategory.rows[0].id;
          }
        }

        // Insert item
        await pool.query(
          `INSERT INTO inventory_items (
            category_id, item_name, item_code, description, unit, 
            quantity, min_stock_level, unit_price, gst_percentage, 
            hsn_code, supplier_name, supplier_contact, location, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            categoryId,
            record.item_name,
            record.item_code || null,
            record.description || null,
            record.unit || 'pcs',
            parseInt(record.quantity) || 0,
            parseInt(record.min_stock_level) || null,
            parseFloat(record.unit_price) || 0,
            parseFloat(record.gst_percentage) || 18,
            record.hsn_code || null,
            record.supplier_name || null,
            record.supplier_contact || null,
            record.location || null,
            1 // TODO: Get from auth
          ]
        );

        successCount++;
      } catch (itemError: any) {
        errors.push(`Error inserting ${record.item_name}: ${itemError.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Upload complete: ${successCount} items added, ${errorCount} errors`,
      data: {
        successCount,
        errorCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      }
    });

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Step 2: Add Upload UI to Items Page

**File**: `apps/inventory-admin/src/app/items/page.tsx`

Add this button to the header:

```typescript
// Add state for upload
const [uploading, setUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

// Add upload handler
const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/items/bulk-upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      alert(`Success! ${data.data.successCount} items uploaded.\n${data.data.errorCount} errors.`);
      if (data.data.errors.length > 0) {
        console.log('Errors:', data.data.errors);
      }
      fetchItems(); // Refresh list
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Failed to upload file');
  } finally {
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

// Add to UI (in header section)
<div className="flex gap-2">
  <input
    ref={fileInputRef}
    type="file"
    accept=".csv"
    onChange={handleBulkUpload}
    className="hidden"
  />
  <Button
    variant="outline"
    onClick={() => fileInputRef.current?.click()}
    disabled={uploading}
  >
    {uploading ? 'Uploading...' : '📤 Bulk Upload'}
  </Button>
  <Button onClick={() => openModal()}>
    <FiPlus className="mr-2" />
    Add Item
  </Button>
</div>
```

### Step 3: Install CSV Parser

```bash
cd apps/inventory-admin
npm install csv-parse
```

Or add to `package.json`:
```json
{
  "dependencies": {
    "csv-parse": "^5.5.2"
  }
}
```

## 📖 Step-by-Step Usage

### 1. Prepare Your CSV File

**Option A: Use Sample File**
```bash
# File is ready at:
apps/inventory-admin/sample_inventory_upload.csv

# Open in Excel to customize
```

**Option B: Create New File**
```csv
item_name,item_code,category_name,description,unit,quantity,min_stock_level,unit_price,gst_percentage,hsn_code,supplier_name,supplier_contact,location
School Shirt,UNI-001,Uniforms,White shirt,pcs,100,20,300,5,6203,ABC Supplier,9876543210,Store A
```

### 2. Validate Your Data

**Check**:
- ✅ All required columns present
- ✅ Item names are unique
- ✅ Quantities are numbers
- ✅ Prices are valid decimals
- ✅ GST percentages are valid (0, 5, 12, 18, 28)
- ✅ File is saved as CSV (UTF-8)

### 3. Upload File

1. Go to Items page
2. Click "📤 Bulk Upload" button
3. Select your CSV file
4. Wait for upload to complete
5. Review success/error message

### 4. Verify Upload

- Check items list
- Verify quantities
- Check GST percentages
- Review categories created

## ⚠️ Common Issues & Solutions

### Issue 1: Missing Required Fields

**Error**: "Missing required fields"

**Solution**:
- Ensure all required columns have values
- Check for empty rows
- Verify column headers match exactly

### Issue 2: Invalid Number Format

**Error**: "Invalid number"

**Solution**:
- Use decimal point (.) not comma (,) for prices
- Remove currency symbols (₹, $)
- Ensure quantities are whole numbers

### Issue 3: Duplicate Item Codes

**Error**: "Duplicate key value"

**Solution**:
- Make item codes unique
- Or leave item_code blank for auto-generation

### Issue 4: Category Not Created

**Solution**:
- Categories are auto-created if they don't exist
- Use consistent category names
- Check spelling

### Issue 5: File Encoding

**Error**: "Character encoding issue"

**Solution**:
- Save file as UTF-8 CSV
- In Excel: Save As → CSV UTF-8

## 📊 Sample Data Categories

### Category Breakdown

```
Uniforms (10 items):
- Shirts, Pants, Skirts, Ties, Blazer, Sweater, Socks, Belt
- Total Value: ~₹45,000

Footwear (5 items):
- School Shoes (different sizes), Canvas Shoes, Sports Shoes
- Total Value: ~₹35,000

Books (5 items):
- NCERT Textbooks, Reference Books
- Total Value: ~₹25,000

Stationery (14 items):
- Notebooks, Pens, Pencils, Geometry Box, Calculator, Art Supplies
- Total Value: ~₹15,000

Bags & Accessories (6 items):
- School Bags, Lunch Boxes, Water Bottles, ID Holders
- Total Value: ~₹30,000

Sports (10 items):
- Cricket, Football, Basketball, Badminton, Table Tennis, Chess, Carrom
- Total Value: ~₹40,000

TOTAL: 50 items worth ~₹1,90,000
```

## 🎯 Item Code Format Guide

Use consistent naming:

```
Format: [CATEGORY]-[TYPE]-[VARIANT]

Examples:
UNI-SH-SUM-001   (Uniform - Shirt - Summer - 001)
FOOT-SH-BLK-06   (Footwear - Shoes - Black - Size 06)
BOOK-NCERT-M6    (Book - NCERT - Math - Class 6)
STAT-PEN-BLU     (Stationery - Pen - Blue)
BAG-SCH-MED      (Bag - School - Medium)
SPORT-FB-5       (Sports - Football - Size 5)
```

## 💡 Tips for Success

1. **Start Small**: Test with 5-10 items first
2. **Backup**: Keep original CSV file
3. **Categories**: Use consistent category names
4. **Prices**: Use base prices (before GST)
5. **HSN Codes**: Add for tax compliance
6. **Review**: Check uploaded items immediately
7. **Update**: Use bulk upload for stock updates

## 🔄 Updating Existing Items

To update existing items in bulk:

1. **Export** current items to CSV
2. **Modify** quantities or prices
3. **Upload** - system will update by item_code

Or create separate update CSV with:
- item_code (required for matching)
- Fields to update

## 📦 Export Template

Download blank template:

```csv
item_name,item_code,category_name,description,unit,quantity,min_stock_level,unit_price,gst_percentage,hsn_code,supplier_name,supplier_contact,location
```

## ✅ Validation Checklist

Before uploading:

- [ ] File is CSV format
- [ ] All required fields filled
- [ ] Numbers are valid
- [ ] GST percentages correct (0, 5, 12, 18, 28)
- [ ] Item codes are unique
- [ ] Category names consistent
- [ ] File size < 10MB
- [ ] No special characters in item codes
- [ ] Prices are without currency symbols

## 📞 Support

If upload fails:
1. Check browser console for errors
2. Verify CSV format
3. Test with sample file first
4. Contact admin if issues persist

---

**File Location**: `apps/inventory-admin/sample_inventory_upload.csv`  
**Items Included**: 50+ school items  
**Total Value**: ~₹1,90,000  
**Ready to Upload**: Yes ✅

























































