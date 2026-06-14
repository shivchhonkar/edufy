# Parent Portal - Quick Setup Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
cd C:\Shiv\projects\Shribi Edufy-Monorepo
npm install
```

### Step 2: Configure Environment
Create `.env.local` file in `apps/parent-portal/`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Shribi Edufy
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret-key
```

### Step 3: Run the Application
```bash
npm run dev:parent-portal
```

Access at: **http://localhost:3001**

## 🔑 Demo Login
- Phone: Any phone number from students table (father_phone/mother_phone)
- Password: `parent123`

Example:
- Phone: `9999999999`
- Password: `parent123`

## ✅ Features Available

### Implemented ✅
1. **Login Page** - Secure authentication
2. **Dashboard** - Overview with stats
3. **Fees Management** - View and pay fees
4. **API Routes** - Backend integration

### Coming Soon 🚧
1. Attendance Page
2. Homework Page
3. Report Card Page
4. Documents Page

## 📋 Database Requirements

Ensure these tables exist in your database:
- `students` (with father_phone, mother_phone)
- `classes`
- `student_fees`
- `fee_structures`
- `fee_categories`
- `fee_payments`
- `attendance`
- `system_settings`

## 🐛 Troubleshooting

**Database Connection Error:**
```
Check .env.local file
Verify PostgreSQL is running
Test connection manually
```

**Package Resolution Error:**
```bash
cd C:\Shiv\projects\Shribi Edufy-Monorepo
npm install --force
```

**Build Error:**
```bash
# Clear cache
rm -rf apps/parent-portal/.next
npm run dev:parent-portal
```

## 📚 Full Documentation

See `PARENT_PORTAL_GUIDE.md` for complete documentation.

## 🎯 Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL
- **Auth:** JWT
- **Icons:** React Icons

## 📞 Need Help?

Check the comprehensive guide: `PARENT_PORTAL_GUIDE.md`



























































