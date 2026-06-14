# Inventory Admin - GST Implementation Guide

## 🎯 Overview

The Inventory Admin now supports complete GST (Goods and Services Tax) functionality for school items including:
- GST percentage configuration per item
- Automatic GST calculation on sales
- GST-compliant invoicing
- HSN/SAC code support
- GST reports and breakdowns

## 📦 Items Supported

The inventory system is designed for school items:

1. **Uniforms** - Shirts, pants, skirts, blazers (GST: 5-12%)
2. **Shoes** - School shoes, sports shoes (GST: 5-12%)
3. **Ties** - School ties (GST: 12%)
4. **Books** - Textbooks, notebooks (GST: 0-5%)
5. **Stationery** - Pens, pencils, geometry boxes (GST: 12-18%)
6. **Bags** - School bags, lunch bags (GST: 12-18%)
7. **Water Bottles** - Steel/plastic bottles (GST: 12-18%)
8. **Sports Equipment** - Bats, balls, etc. (GST: 18%)

## 🔧 GST Configuration

### Item Setup with GST

When adding/editing items, you can configure:

1. **Base Price** - Price excluding GST
2. **GST Percentage** - Choose from:
   - 0% (Exempt items like certain books)
   - 5% (Basic necessities)
   - 12% (Standard rate for stationery)
   - 18% (Standard rate for accessories)
   - 28% (Luxury items, if applicable)

3. **HSN/SAC Code** - Harmonized System of Nomenclature code
   - Example HSN codes:
     - 6301 - Blankets, traveling rugs
     - 6402 - Footwear
     - 4820 - Exercise books, notebooks
     - 9503 - Toys, tricycles

### Price Calculation Formula

```
Selling Price (with GST) = Base Price + (Base Price × GST %)

Example:
Base Price: ₹500
GST: 18%
GST Amount: ₹500 × 18/100 = ₹90
Final Price: ₹500 + ₹90 = ₹590
```

## 💰 Sales with GST

### Sales Process

1. **Select Student**
   - Search by name or admission number
   - Student details saved for invoice

2. **Add Items to Cart**
   - Click items to add
   - Adjust quantities as needed
   - GST calculated automatically

3. **View GST Breakdown**
   - Subtotal (before tax)
   - GST amount by percentage
   - Total amount (including GST)

4. **Complete Sale**
   - Generate GST-compliant invoice
   - Update inventory
   - Record transaction

### GST Calculation in Sales

For multiple items with different GST rates:

```
Item 1: Uniform Shirt
Base Price: ₹300
GST: 5%
GST Amount: ₹15
Total: ₹315

Item 2: School Bag  
Base Price: ₹800
GST: 12%
GST Amount: ₹96
Total: ₹896

Cart Summary:
Subtotal: ₹1,100
GST (5%): ₹15
GST (12%): ₹96
Total GST: ₹111
Grand Total: ₹1,211
```

## 🧾 GST Invoice Format

### Invoice Structure

```
═══════════════════════════════════════════════════
              SCHOOL NAME
          Tax Invoice / Bill of Supply
═══════════════════════════════════════════════════

Invoice No: INV-2025-0001
Date: 14-Oct-2025
Time: 10:30 AM

Student Details:
Name: John Doe
Admission No: 2024/001
Class: 5A

───────────────────────────────────────────────────
Item Details:
───────────────────────────────────────────────────
Item Name        Qty   Price   GST%    Amount
───────────────────────────────────────────────────
School Uniform    2    ₹300    5%      ₹630.00
School Bag        1    ₹800    12%     ₹896.00
Geometry Box      1    ₹150    12%     ₹168.00
───────────────────────────────────────────────────

Subtotal (before tax):              ₹1,250.00

GST Breakdown:
  GST @ 5%  on ₹600:                  ₹30.00
  GST @ 12% on ₹950:                 ₹114.00
  
Total GST:                            ₹144.00
═══════════════════════════════════════════════════
GRAND TOTAL:                        ₹1,394.00
═══════════════════════════════════════════════════

Payment Mode: Cash
Served By: Admin Name

Thank you for your purchase!
```

## 📊 GST Reports

### Available Reports

1. **GST Summary Report**
   - Total sales by GST rate
   - GST collected
   - Tax liability

2. **Monthly GST Report**
   - Month-wise breakup
   - Rate-wise GST collection
   - Export for filing

3. **Item-wise GST Analysis**
   - Sales by item category
   - GST contribution
   - Top revenue items

### Sample GST Report

```
GST Summary Report
Period: October 2025

┌─────────────────────────────────────────────┐
│ GST Rate  Sales Amount  GST Collected       │
├─────────────────────────────────────────────┤
│   0%      ₹15,000      ₹0                   │
│   5%      ₹45,000      ₹2,250               │
│  12%      ₹1,20,000    ₹14,400              │
│  18%      ₹80,000      ₹14,400              │
├─────────────────────────────────────────────┤
│ TOTAL     ₹2,60,000    ₹31,050              │
└─────────────────────────────────────────────┘

CGST (Central GST): ₹15,525
SGST (State GST):   ₹15,525
```

## 🎓 School-Specific Features

### Item Categories

**Uniform & Clothing (GST: 5-12%)**
- Summer uniform set
- Winter uniform set
- Sports uniform
- House T-shirts
- Socks, belts, ties

**Footwear (GST: 5-12%)**
- Black school shoes
- White canvas shoes
- Sports shoes

**Books & Educational Material (GST: 0-5%)**
- NCERT textbooks (0%)
- Reference books
- Workbooks
- Notebooks

**Stationery (GST: 12-18%)**
- Pens, pencils
- Erasers, sharpeners
- Geometry boxes
- Art supplies
- Project materials

**Bags & Accessories (GST: 12-18%)**
- School bags
- Lunch boxes
- Water bottles
- ID card holders

### Bulk Purchase Discounts

For uniforms/books purchased in sets:

```
Example: Complete Uniform Set
- 2 Shirts: ₹600
- 2 Pants: ₹800
- 1 Tie: ₹100
- 1 Pair Shoes: ₹1,200
- 2 Pairs Socks: ₹100

Subtotal: ₹2,800
Bulk Discount (10%): -₹280
After Discount: ₹2,520
GST (avg 8%): ₹202
Total: ₹2,722
```

## 💡 GST Best Practices

### 1. Accurate Item Classification
- Use correct HSN codes
- Apply appropriate GST rates
- Regular rate updates as per govt. notifications

### 2. Proper Documentation
- Generate invoices for all sales
- Maintain digital copies
- Sequential invoice numbering

### 3. Regular Reconciliation
- Match sales with inventory
- Verify GST calculations
- Monthly audit reports

### 4. Compliance
- File GST returns monthly
- Keep records for 6 years
- Update rates as per law

## 🔄 Database Schema

### Items Table (with GST)

```sql
ALTER TABLE inventory_items 
ADD COLUMN gst_percentage DECIMAL(5,2) DEFAULT 18,
ADD COLUMN hsn_code VARCHAR(20),
ADD COLUMN price_includes_gst BOOLEAN DEFAULT FALSE;
```

### Sales Table (with GST)

```sql
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE,
  student_id INTEGER,
  sale_date TIMESTAMP DEFAULT NOW(),
  subtotal DECIMAL(10,2),
  total_gst DECIMAL(10,2),
  grand_total DECIMAL(10,2),
  payment_mode VARCHAR(20),
  created_by INTEGER
);

CREATE TABLE sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER,
  item_id INTEGER,
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  gst_percentage DECIMAL(5,2),
  gst_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2)
);
```

## 📝 Example Use Cases

### Use Case 1: New Admission - Complete Kit

**Scenario**: New student joins, needs complete school kit

**Items Required**:
1. Uniform Set (₹1,500 + 5% GST = ₹1,575)
2. Shoes (₹1,200 + 12% GST = ₹1,344)
3. School Bag (₹900 + 12% GST = ₹1,008)
4. Books Set (₹2,000 + 0% GST = ₹2,000)
5. Stationery Kit (₹500 + 18% GST = ₹590)

**Total**: ₹6,517 (including GST of ₹517)

### Use Case 2: Mid-Year Purchase

**Scenario**: Student needs replacement items

**Items**:
1. 1 Notebook (₹30 + 5% GST = ₹31.50)
2. 2 Pens (₹20 + 18% GST = ₹23.60)
3. 1 Geometry Box (₹150 + 12% GST = ₹168)

**Total**: ₹223.10 (including GST of ₹23.10)

## 🎯 Quick Reference

### Common GST Rates for School Items

| Item Category | Typical GST Rate |
|---------------|------------------|
| Textbooks | 0% or 5% |
| Notebooks | 5% or 12% |
| Uniforms | 5% or 12% |
| Footwear | 5% or 12% |
| Bags | 12% or 18% |
| Stationery | 12% or 18% |
| Sports Equipment | 18% |
| Electronics | 18% |

### HSN Codes Reference

| Item | HSN Code |
|------|----------|
| Books | 4901 |
| Notebooks | 4820 |
| Pens | 9608 |
| School Bags | 4202 |
| Footwear | 6402/6404 |
| Uniforms | 6203/6204 |
| Geometry Instruments | 9017 |

## ✅ Checklist for GST Compliance

- [ ] All items have correct GST percentage
- [ ] HSN codes added for items
- [ ] Invoice numbering sequential
- [ ] Student details captured
- [ ] GST breakdown shown on invoice
- [ ] Payment mode recorded
- [ ] Monthly reports generated
- [ ] Records backed up

## 📞 Support

For GST-related queries:
- Check govt. GST portal: https://www.gst.gov.in
- Consult tax professional for rate changes
- Keep updated with notifications

---

**Document Version**: 1.0  
**Last Updated**: October 14, 2025  
**Status**: Production Ready

























































