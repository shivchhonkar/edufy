# Inventory Admin - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Application

```bash
cd apps/inventory-admin
npm run dev
```

The app will start on: **http://localhost:3002**

### Step 2: Login

1. Open browser: `http://localhost:3002`
2. You'll be redirected to the login page
3. Enter credentials:
   - Email: (inventory manager email)
   - Password: (your password)
4. Click "Sign In"

### Step 3: Navigate

Once logged in, you'll see the dashboard with the sidebar:

```
┌────────────────────────────────────────┐
│ 🏢 Shribi Edufy Inventory                 │
├────────────────────────────────────────┤
│ 🏠 Dashboard      ← You are here      │
│ 📦 Items                               │
│ 🏷️  Categories                         │
│ 🛒 Sales                               │
│ 💰 Transactions                        │
│ 📊 Reports                             │
├────────────────────────────────────────┤
│ 🚪 Logout                              │
└────────────────────────────────────────┘
```

Click any menu item to navigate!

## 📋 Key Features

### ✨ Sidebar Navigation
- **Collapse/Expand**: Click the ← button to minimize
- **Active Highlighting**: Current page is highlighted
- **Tooltips**: Hover over icons in collapsed mode
- **Persistent**: Remembers your preference

### 🔐 Authentication
- **Protected Routes**: Must be logged in to access
- **Role-Based**: Only inventory managers can access
- **Session**: Stays logged in until logout

### 📊 Dashboard
- **Stats Cards**: Total items, low stock, sales, students
- **Quick Actions**: Jump to any section
- **Alerts**: Low stock warnings

## 🎯 Common Tasks

### Add Inventory Item
1. Click "Items" in sidebar
2. Click "+ Add Item"
3. Fill in details
4. Save

### Record a Sale
1. Click "Sales" in sidebar
2. Click "New Sale"
3. Select student and items
4. Complete transaction

### Check Low Stock
1. Dashboard shows low stock alerts
2. Click "Restock" button
3. Add to transactions

### View Reports
1. Click "Reports" in sidebar
2. Select report type
3. Choose date range
4. Generate

## ⚙️ Settings

### Collapse Sidebar
- Click the ← button in sidebar header
- Sidebar minimizes to icons only
- Click ☰ to expand again

### Logout
- Click "Logout" in sidebar
- Redirected to login page
- Session cleared

## 📱 Mobile Access

The inventory admin is responsive:

- **Desktop**: Full sidebar + content
- **Tablet**: Compact sidebar + content
- **Mobile**: Overlay sidebar

## 🆘 Troubleshooting

### Can't Login?
- Check role (must be inventory_manager, admin, or super_admin)
- Verify database is running
- Check network tab for errors

### Sidebar Not Showing?
- Refresh the page
- Clear localStorage: `localStorage.clear()`
- Check you're not on login page

### Data Not Loading?
- Check API endpoints are running
- Verify database connection
- Check browser console for errors

## 📚 Documentation

- **Full Guide**: `SIDEBAR_NAVIGATION_COMPLETE.md`
- **API Docs**: `README.md`
- **Auth Guide**: `AUTHENTICATION.md`

## 🎨 Theme Colors

- **Primary**: Indigo (#4f46e5)
- **Success**: Green
- **Warning**: Yellow
- **Error**: Red
- **Background**: Gray-50

## ⌨️ Keyboard Shortcuts (Coming Soon)

- `Ctrl/Cmd + K` - Search
- `Ctrl/Cmd + B` - Toggle sidebar
- `Esc` - Close modals

## 🔗 Quick Links

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Overview and stats |
| Items | `/items` | Manage inventory |
| Categories | `/categories` | Item categories |
| Sales | `/sales` | Record sales |
| Transactions | `/transactions` | Stock management |
| Reports | `/reports` | Analytics |
| Login | `/login` | Authentication |

## 💡 Tips

1. **Bookmark** the dashboard for quick access
2. **Collapse sidebar** for more screen space
3. **Check alerts** daily for low stock
4. **Generate reports** weekly/monthly
5. **Keep items** properly categorized

## ✅ Checklist

Before going live:
- [ ] Database is set up
- [ ] User accounts created
- [ ] Items and categories added
- [ ] Stock levels set
- [ ] Min stock levels configured
- [ ] Prices updated
- [ ] Test sale transaction
- [ ] Test report generation

## 🎉 You're Ready!

Start managing your school inventory efficiently with Shribi Edufy Inventory Admin.

---

**Need Help?** Check the full documentation or contact support.

**Version**: 1.0  
**Port**: http://localhost:3002  
**Last Updated**: October 14, 2025

























































