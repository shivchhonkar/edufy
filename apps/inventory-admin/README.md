# Inventory Admin

✅ **FULLY FUNCTIONAL** - Point-of-sale and complete inventory management system.

## Features

- ✅ **Inventory item management** - CRUD operations for items (books, uniforms, stationery)
- ✅ **Category management** - Organize items by categories
- ✅ **Point of Sale (POS)** - Quick sales interface for selling to students
- ✅ **Stock transactions** - Purchase orders, issues, returns, damages, adjustments
- ✅ **Low stock alerts** - Real-time alerts on dashboard with restock estimates
- ✅ **Sales reports & analytics** - Transaction summaries and CSV exports
- ✅ **Student search** - Quick student lookup for sales
- ✅ **Real-time stats** - Dashboard with live inventory metrics

## Access

**Role Required:** `inventory_manager` or `admin`

## Port

Development: `http://localhost:3004`

## Pages

### Dashboard (`/`)
- Real-time statistics
- Low stock alerts with estimated restock costs
- Quick navigation cards

### Items Management (`/items`)
- Full CRUD operations
- Search and filter
- Stock level monitoring
- Category assignment

### Point of Sale (`/sales`)
- Student search
- Item cart
- Real-time total calculation
- Automatic stock deduction

### Transactions (`/transactions`)
- Purchase orders
- Stock issues/sales
- Returns and damages
- Transaction history

### Categories (`/categories`)
- Create and edit categories
- Organize inventory

### Reports (`/reports`)
- Sales analytics
- Purchase tracking
- Transaction summaries
- CSV export

## Quick Start

```bash
# Install dependencies (from monorepo root)
npm install

# Run in development mode
cd apps/inventory-admin
npm run dev

# Access at http://localhost:3004
```

**First Time Setup:**
1. Create an inventory manager user in the database (see [AUTHENTICATION.md](./AUTHENTICATION.md))
2. Navigate to `http://localhost:3004`
3. You'll be redirected to `/login`
4. Enter your credentials
5. Access the dashboard

## Authentication

The app requires login with one of these roles:
- `inventory_manager`
- `admin`  
- `super_admin`

See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete authentication documentation.

## Database Setup

The app uses the following tables from the shared database:
- `inventory_items` - Item master data
- `inventory_categories` - Item categories
- `inventory_transactions` - All stock movements
- `student_inventory` - Student purchase records
- `students` - For student search

Make sure the database schema is set up using `database/schema.sql`.

## Usage Guide

See [USAGE.md](./USAGE.md) for detailed user guide and workflows.

## Design Philosophy

- **POS-first**: Quick sales interface for daily operations
- **Simple workflow**: Minimal clicks from search to sale
- **Real-time updates**: Stock levels update immediately
- **Visual alerts**: Color-coded low stock warnings
- **Data-driven**: Everything tracked in transactions

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via @Shribi Edufy/database)
- **Shared Packages**: 
  - @Shribi Edufy/types
  - @Shribi Edufy/utils
  - @Shribi Edufy/ui
  - @Shribi Edufy/database

## API Routes

All API routes are fully functional:
- `GET/POST /api/items` - Items management
- `PUT/DELETE /api/items/:id` - Update/delete items
- `GET/POST /api/categories` - Categories
- `GET/POST /api/transactions` - Stock transactions
- `POST /api/sales` - Complete sales
- `GET /api/students/search` - Student lookup
- `GET /api/stats` - Dashboard statistics

