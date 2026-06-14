# 📦 Inventory Bulk Upload - Quick Start

## ✅ What's Ready

Your bulk upload feature is now fully implemented and ready to use!

## 📁 Files Provided

### 1. **sample_inventory_upload.csv**
- **50+ ready-to-use school items**
- Includes: Uniforms, Footwear, Books, Stationery, Bags, Sports Equipment
- All items have correct GST percentages and HSN codes
- Total value: ~₹1,90,000
- **You can upload this file directly!**

### 2. **template_inventory_upload.csv**
- Blank template with just headers
- Use this to create your own custom uploads

### 3. **BULK_UPLOAD_GUIDE.md**
- Complete documentation
- Column descriptions
- Troubleshooting guide
- Best practices

## 🚀 How to Use (3 Steps)

### Step 1: Install Dependencies
```bash
cd apps/inventory-admin
npm install
```

### Step 2: Start the Server
```bash
npm run dev
```

### Step 3: Upload Items

1. Open: `http://localhost:3004/items`
2. Click the **"📤 Bulk Upload"** button
3. Select `sample_inventory_upload.csv`
4. Wait for upload to complete
5. ✅ Done! All 50 items are now in your inventory

## 📊 What Gets Uploaded

The sample file includes:

| Category | Items | Example Items | GST |
|----------|-------|---------------|-----|
| **Uniforms** | 10 | Shirts, Pants, Ties, Blazer | 5-12% |
| **Footwear** | 5 | School Shoes, Sports Shoes | 5-12% |
| **Books** | 5 | NCERT Textbooks | 0-5% |
| **Stationery** | 14 | Notebooks, Pens, Calculator | 5-18% |
| **Bags** | 6 | School Bags, Lunch Boxes | 12-18% |
| **Sports** | 10 | Cricket, Football, Badminton | 18% |

**Total: 50 items worth ₹1,90,000**

## 📝 CSV Format

```csv
item_name,item_code,category_name,description,unit,quantity,min_stock_level,unit_price,gst_percentage,hsn_code,supplier_name,supplier_contact,location
School Uniform Shirt,UNI-SH-001,Uniforms,White cotton shirt,pcs,100,20,300,5,6203,Uniform Makers,9876543210,Store Room A
```

## ✨ Features

- ✅ **Auto-create categories** - Categories are created automatically if they don't exist
- ✅ **GST Support** - Supports 0%, 5%, 12%, 18%, 28% GST rates
- ✅ **HSN Codes** - Tax compliance ready
- ✅ **Validation** - Checks for required fields and valid data
- ✅ **Error Reporting** - Shows which rows failed and why
- ✅ **Duplicate Prevention** - Won't create items with duplicate item codes

## 🎯 Required Fields

These fields are **mandatory** in your CSV:
- `item_name` - Name of the item
- `unit` - Unit of measurement (pcs, kg, ltr, pack, pair, etc.)
- `quantity` - Initial stock quantity
- `unit_price` - Base price before GST
- `gst_percentage` - GST rate (0, 5, 12, 18, or 28)

## 🔧 Create Your Own CSV

### Option 1: Modify Sample File
1. Open `sample_inventory_upload.csv` in Excel
2. Edit items, quantities, prices
3. Save as CSV (UTF-8)
4. Upload!

### Option 2: Start from Scratch
1. Open `template_inventory_upload.csv`
2. Add your items following the format
3. Save as CSV (UTF-8)
4. Upload!

## 💡 Tips

1. **Test First** - Upload 5-10 items first to test
2. **UTF-8 Encoding** - Always save as UTF-8 CSV
3. **No Currency Symbols** - Use `300` not `₹300`
4. **Decimal Point** - Use `.` not `,` for decimals
5. **Unique Codes** - Item codes must be unique
6. **Valid GST** - Only use 0, 5, 12, 18, or 28

## ⚠️ Common Issues

**Issue**: "Missing required fields"
- **Fix**: Make sure item_name, unit, quantity, unit_price are filled

**Issue**: "Duplicate item code"
- **Fix**: Make item codes unique or leave blank

**Issue**: "Invalid GST percentage"
- **Fix**: Use only 0, 5, 12, 18, or 28

**Issue**: "CSV parsing error"
- **Fix**: Save file as CSV (UTF-8) format

## 📞 Example Upload Result

```
✅ Upload Complete!

Total Rows: 50
✓ Successfully Added: 50
✗ Errors: 0
```

## 🎉 Next Steps

After uploading:
1. Check the items list - all 50 items should appear
2. Verify stock quantities
3. Check GST percentages
4. Review categories that were created
5. Start selling items!

## 📖 Full Documentation

For detailed documentation, see: **BULK_UPLOAD_GUIDE.md**

---

**Happy Uploading! 🚀**


























































