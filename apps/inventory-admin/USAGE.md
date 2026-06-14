# Inventory Admin - User Guide

## Overview

The Inventory Admin app is a complete point-of-sale and inventory management system designed for schools. It helps manage inventory items, track stock levels, record sales, and generate reports.

## Features

### 1. Dashboard (Home Page)

**URL:** `/`

The dashboard provides an at-a-glance view of your inventory:

- **Total Items**: Count of all inventory items
- **Low Stock Items**: Items that need restocking
- **Sales This Month**: Total revenue from sales this month
- **Students Served**: Number of students who purchased items

**Low Stock Alerts**: Shows items that have fallen below their minimum stock level with estimated restock costs.

### 2. Inventory Items Management

**URL:** `/items`

**Features:**
- View all inventory items in a table
- Search items by name or code
- Filter items by category
- Add new items
- Edit existing items
- Delete items
- See stock levels with visual alerts for low stock

**Adding an Item:**
1. Click "Add Item" button
2. Fill in the form:
   - Item Name (required)
   - Item Code (optional but recommended)
   - Category
   - Unit (pcs, kg, ltr, etc.)
   - Current Stock (required for new items)
   - Minimum Stock Level (for alerts)
   - Unit Price
   - Supplier Name & Contact
   - Location
   - Description
3. Click "Save Item"

**Note:** After creating an item, stock can only be updated through transactions.

### 3. Point of Sale (POS)

**URL:** `/sales`

**Features:**
- Quick sale interface
- Search and select items
- Search and select student
- Add items to cart
- Adjust quantities
- Complete sale
- Automatic stock deduction

**Making a Sale:**
1. Click "Select Student" and search for the student
2. Browse or search for items
3. Click on items to add them to cart
4. Adjust quantities as needed
5. Review total
6. Click "Complete Sale"

The system will:
- Deduct stock from inventory
- Create transaction records
- Update student inventory

### 4. Stock Transactions

**URL:** `/transactions`

**Features:**
- View all inventory transactions
- Filter by transaction type
- Create new transactions
- Track purchase orders, issues, returns, damages, and adjustments

**Transaction Types:**
- **Purchase**: Adding stock (increases quantity)
- **Issue/Sale**: Selling or issuing items (decreases quantity)
- **Return**: Stock returned (increases quantity)
- **Damage**: Damaged items removed (decreases quantity)
- **Adjustment**: Manual stock adjustment

**Creating a Transaction:**
1. Click "New Transaction"
2. Select the item
3. Choose transaction type
4. Enter quantity
5. Enter unit price (optional, defaults to item's unit price)
6. Select date
7. Add remarks if needed
8. Click "Save Transaction"

The stock quantity will be automatically updated.

### 5. Categories Management

**URL:** `/categories`

**Features:**
- View all item categories
- Add new categories
- Edit categories

**Use Categories for:**
- Books
- Uniforms
- Stationery
- Sports Equipment
- Lab Equipment
- etc.

### 6. Reports & Analytics

**URL:** `/reports`

**Features:**
- Total sales amount
- Total purchases amount
- Number of items issued
- Net value calculation
- Transaction summary by item
- Export to CSV

**Using Reports:**
- Filter by transaction type
- Filter by date range (coming soon)
- View itemized summaries
- Export data for external analysis

**Export to CSV:**
Click "Export CSV" to download current report data for Excel or Google Sheets.

## Quick Workflows

### Setting Up New Inventory

1. Create categories (`/categories`)
2. Add items (`/items`)
3. Record initial stock via purchase transactions (`/transactions`)

### Daily Sales Workflow

1. Go to POS (`/sales`)
2. Select student
3. Add items to cart
4. Complete sale
5. Repeat for next student

### Restocking Workflow

1. Check dashboard for low stock alerts
2. Go to Transactions (`/transactions`)
3. Create "Purchase" transaction
4. Enter quantity and price
5. Stock is automatically updated

### Monthly Reporting

1. Go to Reports (`/reports`)
2. Review sales and purchase totals
3. Check transaction summary
4. Export to CSV if needed

## Best Practices

### Stock Management
- Always set minimum stock levels when adding items
- Review low stock alerts daily
- Create purchase orders before stock runs out
- Keep unit prices updated

### Data Entry
- Use consistent item codes (e.g., BOOK-001, UNIF-M-001)
- Add detailed descriptions
- Include supplier information
- Update location information

### Sales Process
- Always verify student before completing sale
- Double-check quantities before checkout
- Add remarks for special transactions
- Review cart before completing

### Reporting
- Export monthly reports for records
- Review transaction history regularly
- Monitor best-selling items
- Track purchase vs. sales trends

## Tips & Tricks

1. **Quick Item Search**: Use item codes for faster searching in POS
2. **Bulk Updates**: Use transactions for bulk stock updates
3. **Low Stock**: Set minimum levels 20-30% above average monthly usage
4. **Categories**: Keep categories simple and intuitive
5. **Reports**: Export data monthly for backup

## Keyboard Shortcuts

- **Search**: Click in search box and start typing
- **Navigate**: Use Tab to move between form fields
- **Submit Forms**: Press Enter in form fields

## Technical Details

### Database Tables Used
- `inventory_items`: Main items table
- `inventory_categories`: Item categories
- `inventory_transactions`: All stock movements
- `student_inventory`: Student purchase records

### API Endpoints
- `GET /api/items` - Fetch items
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/categories` - Fetch categories
- `POST /api/categories` - Create category
- `GET /api/transactions` - Fetch transactions
- `POST /api/transactions` - Create transaction
- `POST /api/sales` - Complete sale
- `GET /api/students/search` - Search students
- `GET /api/stats` - Dashboard statistics

## Support

For technical issues or feature requests, contact your system administrator.

## Future Enhancements

Planned features:
- Barcode scanning for items
- Receipt printing
- Inventory valuation reports
- Stock transfer between locations
- Vendor management
- Purchase order generation
- Mobile app for POS


























































