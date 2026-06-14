# Inventory Admin - Setup Checklist

## Initial Setup

### ✅ Prerequisites
- [ ] PostgreSQL database is running
- [ ] Database schema is created (`database/schema.sql`)
- [ ] All monorepo packages are installed (`npm install` from root)
- [ ] Environment variables are configured (if needed)

### ✅ First Time Setup Steps

#### 1. Create Categories (5 minutes)
Navigate to `/categories` and create your item categories:

**Recommended categories:**
- [ ] Books & Textbooks
- [ ] School Uniforms
- [ ] Stationery
- [ ] Sports Equipment
- [ ] Lab Equipment
- [ ] ID Cards & Accessories
- [ ] Other

**Example:**
```
Name: Books & Textbooks
Description: All curriculum books and reference materials
```

#### 2. Add Initial Inventory Items (15-30 minutes)
Navigate to `/items` and add your inventory items:

**For each item, enter:**
- [ ] Item name (required)
- [ ] Item code (recommended: BOOK-001, UNIF-S-001)
- [ ] Category
- [ ] Unit (pcs, kg, set, etc.)
- [ ] Initial stock quantity
- [ ] Minimum stock level (for alerts)
- [ ] Unit price
- [ ] Supplier information (if available)

**Example Book:**
```
Item Name: Class 10 - Mathematics NCERT
Item Code: BOOK-10M
Category: Books & Textbooks
Unit: pcs
Current Stock: 50
Minimum Stock Level: 10
Unit Price: 250.00
Supplier: NCERT Publications
```

**Example Uniform:**
```
Item Name: School Uniform - Size M (Boys)
Item Code: UNIF-M-B
Category: School Uniforms
Unit: set
Current Stock: 25
Minimum Stock Level: 10
Unit Price: 1500.00
Supplier: Uniform House Ltd
```

#### 3. Test the System (5 minutes)

**Test POS:**
- [ ] Go to `/sales`
- [ ] Search for a student
- [ ] Add items to cart
- [ ] Complete a test sale
- [ ] Verify stock was deducted

**Test Transactions:**
- [ ] Go to `/transactions`
- [ ] Create a "Purchase" transaction
- [ ] Verify stock increased

**Check Dashboard:**
- [ ] Go to `/`
- [ ] Verify statistics are showing
- [ ] Check if low stock alerts appear (if any items are below minimum)

## Daily Operations Checklist

### Morning Tasks
- [ ] Check dashboard for low stock alerts
- [ ] Review any pending restock needs
- [ ] Verify POS system is working

### During School Hours
- [ ] Process student purchases via POS
- [ ] Record any stock issues
- [ ] Handle returns if applicable

### End of Day
- [ ] Review daily sales report
- [ ] Check stock levels
- [ ] Note items needing reorder

### Weekly Tasks
- [ ] Review transaction history
- [ ] Export weekly report
- [ ] Update prices if needed
- [ ] Process purchase orders

### Monthly Tasks
- [ ] Generate monthly reports
- [ ] Reconcile physical stock with system
- [ ] Update minimum stock levels based on usage
- [ ] Review supplier performance

## Tips for Success

### Stock Management
1. **Set realistic minimum levels**: Base on 2-3 weeks of average usage
2. **Update prices regularly**: Keep unit prices current
3. **Use item codes**: Makes searching faster in POS
4. **Track suppliers**: Helps with reordering

### Data Entry
1. **Be consistent**: Use same naming conventions
2. **Add descriptions**: Helps identify items quickly
3. **Location tracking**: Note where items are stored
4. **Complete info**: Fill all fields for better reporting

### Daily Sales
1. **Verify student**: Always confirm student before sale
2. **Check stock**: POS shows available quantity
3. **Review cart**: Double-check before completing
4. **Add remarks**: Note special circumstances

### Reporting
1. **Export monthly**: Keep CSV backups
2. **Monitor trends**: Track best sellers
3. **Review regularly**: Check for discrepancies
4. **Share insights**: Use reports for planning

## Common Tasks

### Adding New Stock
1. Go to `/transactions`
2. Click "New Transaction"
3. Select item
4. Choose "Purchase"
5. Enter quantity and price
6. Save

### Selling Items
1. Go to `/sales`
2. Click "Select Student"
3. Search and select student
4. Click items to add to cart
5. Adjust quantities if needed
6. Click "Complete Sale"

### Checking Low Stock
1. Go to `/` (dashboard)
2. View "Low Stock Alerts" section
3. Click "Restock" to create purchase order

### Generating Reports
1. Go to `/reports`
2. Apply filters if needed
3. Review statistics
4. Click "Export CSV" for detailed report

## Troubleshooting

### Can't find a student in POS
- Ensure student status is "active"
- Check spelling
- Try searching by admission number

### Stock not updating
- Check transaction was saved successfully
- Verify item ID matches
- Review transaction history

### Low stock alerts not showing
- Check if minimum stock level is set
- Verify stock quantity is below minimum
- Refresh dashboard

### Reports showing wrong data
- Check date filters
- Verify transaction types
- Clear browser cache and refresh

## Support & Resources

- **User Guide**: See [USAGE.md](./USAGE.md)
- **API Documentation**: Check README.md
- **Database Schema**: See `database/schema.sql`

## Sample Data (Optional)

For testing purposes, you can create these sample items:

1. **Exercise Book** (STAT-001) - ₹40, Min: 50
2. **Geometry Box** (STAT-002) - ₹120, Min: 20
3. **School Tie** (UNIF-TIE) - ₹150, Min: 30
4. **PE T-Shirt Size M** (UNIF-PE-M) - ₹400, Min: 25
5. **ID Card** (ACC-ID) - ₹100, Min: 100

---

**Ready to start? Follow the checklist above and your inventory system will be up and running! 🚀**


























































