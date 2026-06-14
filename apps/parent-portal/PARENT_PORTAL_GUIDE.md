# Shribi Edufy Parent Portal - Complete Guide

## 🎯 Overview

The Parent Portal is a comprehensive web application that allows parents to monitor their children's academic progress, pay fees online, view attendance, and interact with the school system.

## ✨ Features Implemented

### 1. **Authentication System** ✅
- Secure login with phone number and password
- JWT-based token authentication  
- Demo credentials for testing
- Automatic session management

### 2. **Dashboard** ✅
- Multi-child support (parents can view all their children)
- Quick overview cards showing:
  - Attendance percentage for current month
  - Pending fees amount
  - Pending homework count
  - Overall grade
- Quick action cards for easy navigation
- Recent activity feed

### 3. **Fees Management** ✅
- Detailed fee breakdown by month
- Fee payment selection
- Summary cards showing total, paid, and pending amounts
- Fee status tracking (Paid, Pending, Overdue)
- Late fee calculation display
- Download receipt functionality (placeholder)

### 4. **API Routes** ✅
- `/api/auth/login` - Parent authentication
- `/api/dashboard/stats` - Dashboard statistics
- `/api/fees` - Fee details retrieval

## 🏗️ Architecture

```
apps/parent-portal/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── login/
│   │   │   │       └── route.ts
│   │   │   ├── dashboard/
│   │   │   │   └── stats/
│   │   │   │       └── route.ts
│   │   │   └── fees/
│   │   │       └── route.ts
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── fees/
│   │   │   └── [studentId]/
│   │   │       └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/
│       └── db.ts
├── package.json
├── next.config.js
├── tsconfig.json
└── tailwind.config.js
```

## 🚀 Getting Started

### Prerequisites
1. Node.js 18+ installed
2. PostgreSQL database running
3. Shribi Edufy database schema set up

### Installation

1. **Install dependencies:**
   ```bash
   cd C:\Shiv\projects\Shribi Edufy-Monorepo
   npm install
   ```

2. **Set up environment variables:**
   Create `.env.local` in `apps/parent-portal/`:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=Shribi Edufy
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # Next Auth
   NEXTAUTH_URL=http://localhost:3001
   NEXTAUTH_SECRET=your-nextauth-secret-key-change-this
   ```

3. **Run the development server:**
   ```bash
   npm run dev:parent-portal
   ```

4. **Access the portal:**
   Open [http://localhost:3001](http://localhost:3001)

## 🔐 Demo Credentials

For testing purposes, you can use:
- **Phone:** Any phone number that exists in the students table (father_phone or mother_phone)
- **Password:** `parent123` or `demo123`

Example:
- Phone: `9999999999`
- Password: `parent123`

## 📱 Features by Page

### Login Page (`/login`)
- Phone number and password authentication
- Remember me functionality
- Forgot password link (placeholder)
- Responsive design
- Loading states

### Dashboard (`/dashboard`)
- **Child Selection**: Click on any child to view their details
- **Statistics Cards**:
  - **Attendance**: Current month attendance percentage with trend
  - **Pending Fees**: Total pending fee amount
  - **Homework**: Count of pending assignments
  - **Grades**: Overall grade average
- **Quick Actions**: Navigate to different sections
- **Recent Activity**: Timeline of recent events

### Fees Page (`/fees/[studentId]`)
- **Summary Cards**: Total, Paid, and Pending amounts
- **Fee Table**: Detailed breakdown with:
  - Fee type and month
  - Due date
  - Amount and paid amount
  - Late fees
  - Balance
  - Status
- **Payment Selection**: Select multiple fees for payment
- **Payment Button**: Process selected fees (demo mode)

## 🎨 UI Components

### Shared Components (from `@Shribi Edufy/ui`)
- `StatCard`: Reusable statistic display card
- More components can be added to the shared UI package

### Custom Components
- `QuickActionCard`: Action buttons on dashboard
- `ActivityItem`: Activity feed items

## 🔧 API Integration

### Authentication Flow
1. User submits phone and password
2. API validates credentials against student records
3. JWT token is generated and returned
4. Token is stored in localStorage
5. Token is sent with all subsequent API requests

### Data Fetching
All API routes use:
- PostgreSQL for data storage
- JWT for authentication
- Next.js API routes for endpoints

## 🎯 Database Schema Requirements

The parent portal uses the following tables:
- `students` - Student information
- `classes` - Class details
- `student_fees` - Fee records
- `fee_structures` - Fee structure definitions
- `fee_categories` - Fee categories
- `attendance` - Attendance records
- `fee_payments` - Payment records
- `system_settings` - System configuration

## 📊 Features Pending Implementation

### High Priority
1. **Attendance Page** - Detailed attendance view with calendar
2. **Homework Page** - View and submit assignments
3. **Report Card Page** - Academic performance and grades
4. **Documents Page** - Download receipts and reports

### Medium Priority
5. **Payment Gateway Integration** - Actual online payment processing
6. **Notifications** - Push notifications for important updates
7. **Profile Management** - Update contact information
8. **Chat Support** - Communicate with teachers/admin

### Low Priority
9. **Online Classes** - Join live sessions
10. **Timetable** - View class schedule
11. **Events Calendar** - School events and holidays
12. **Transport Tracking** - Real-time bus tracking

## 🛠️ Development Guide

### Adding a New Page

1. **Create the page component:**
   ```tsx
   // apps/parent-portal/src/app/newpage/page.tsx
   'use client';
   
   export default function NewPage() {
     return <div>New Page Content</div>;
   }
   ```

2. **Create API route if needed:**
   ```ts
   // apps/parent-portal/src/app/api/newroute/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { query } from '@/lib/db';
   
   export async function GET(request: NextRequest) {
     // Implementation
   }
   ```

3. **Add navigation:**
   Update dashboard quick actions to include the new page.

### Database Queries

Use the `query` function from `@/lib/db`:

```ts
import { query } from '@/lib/db';

const result = await query(
  'SELECT * FROM students WHERE id = $1',
  [studentId]
);

const student = result.rows[0];
```

## 🔒 Security Considerations

1. **Password Hashing**: Currently using demo mode - implement bcrypt for production
2. **JWT Tokens**: Use strong secrets in production
3. **SQL Injection**: All queries use parameterized statements
4. **XSS Protection**: React escapes content by default
5. **CORS**: Configure properly for production

## 🚦 Running in Production

### Build the Application
```bash
npm run build:parent-portal
```

### Start Production Server
```bash
npm run start:parent-portal
```

### Environment Variables
Ensure all production environment variables are set:
- Use strong JWT secrets
- Configure production database
- Set proper NEXTAUTH_URL

## 📝 Testing

### Manual Testing Checklist
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] View dashboard for parent with one child
- [ ] View dashboard for parent with multiple children
- [ ] Switch between children
- [ ] View fee details
- [ ] Select and "pay" fees
- [ ] View attendance (when implemented)
- [ ] Logout functionality

## 🐛 Troubleshooting

### Common Issues

**Issue: Cannot connect to database**
- Check `.env.local` file exists and has correct credentials
- Verify PostgreSQL is running
- Check database name and port

**Issue: Module not found '@EduLakhya/ui'**
- Run `npm install` in the root directory
- Packages should use source files (`.ts`), not dist

**Issue: Unauthorized errors**
- Check JWT_SECRET is set correctly
- Verify token is being sent in Authorization header
- Check token expiration

**Issue: No data showing**
- Verify student records exist in database
- Check student has father_phone or mother_phone set
- Ensure academic year is set in system_settings

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Check the database schema
4. Contact the development team

## 📜 License

This is part of the Shribi Edufy School Management System.

---

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Port:** 3001



























































