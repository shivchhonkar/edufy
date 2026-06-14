# Environment Setup for Parent Portal

## ❗ IMPORTANT: Database Configuration Required

The parent portal needs to connect to your PostgreSQL database. Follow these steps:

### Step 1: Create .env.local File

Create a file named `.env.local` in the `apps/parent-portal/` directory:

```
C:\Shiv\projects\Shribi Edufy-Monorepo\apps\parent-portal\.env.local
```

### Step 2: Add Database Configuration

Copy and paste this into `.env.local` (update with your actual values):

```env
# Database Configuration (REQUIRED)

DB_HOST=localhost
DB_PORT=5432
DB_NAME=edu_crm
DB_USER=postgres
DB_PASSWORD=shiv

# JWT Secret (REQUIRED)
JWT_SECRET=my-super-secret-jwt-key-12345

# Next Auth (Optional)
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=my-nextauth-secret-key-67890
```

### Step 3: Update Your Database Password

**IMPORTANT:** Replace `your_actual_password_here` with your actual PostgreSQL password!

You can find your database credentials from the super-admin app:
```
C:\Shiv\projects\Shribi Edufy-Monorepo\apps\super-admin\.env.local
```

Or check the original Shribi Edufy app:
```
C:\Shiv\projects\Shribi Edufy\.env.local
```

### Step 4: Test Database Connection

After creating `.env.local`, restart your dev server and test:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev:parent-portal
```

Visit: http://localhost:3001/api/test

You should see:
```json
{
  "success": true,
  "message": "Database connection successful",
  "data": {
    "currentTime": "...",
    "totalStudents": 10,
    "studentsWithParentPhone": 5
  }
}
```

### Step 5: Try Logging In

1. Go to http://localhost:3001/login
2. Enter a phone number from your students table
3. Password: `parent123` or `demo123`

## 🔍 Finding a Valid Phone Number

To find a phone number to test with:

### Option 1: Check Super Admin App
1. Go to http://localhost:3000/students
2. Click on any student
3. Look for Father's Phone or Mother's Phone
4. Use that number for login

### Option 2: Query Database Directly
```sql
SELECT first_name, last_name, father_phone, mother_phone 
FROM students 
WHERE father_phone IS NOT NULL OR mother_phone IS NOT NULL
LIMIT 5;
```

## ⚠️ Common Issues

### Issue: "An error occurred during login"

**Cause:** Database connection failed or `.env.local` not configured

**Solution:**
1. Create `.env.local` file
2. Add correct database credentials
3. Restart dev server

### Issue: "No students found for this phone number"

**Cause:** The phone number doesn't exist in the database

**Solution:**
1. Use a phone number from an existing student record
2. Or add a student with a phone number in super-admin

### Issue: Connection timeout

**Cause:** PostgreSQL not running or wrong host/port

**Solution:**
1. Check if PostgreSQL is running
2. Verify DB_HOST and DB_PORT in `.env.local`
3. Test connection: `psql -U postgres -d Shribi Edufy`

## 📋 Checklist

Before testing login:
- [ ] Created `.env.local` file
- [ ] Added all required environment variables
- [ ] Updated DB_PASSWORD with actual password
- [ ] Restarted dev server
- [ ] Tested /api/test endpoint (should return success)
- [ ] Found a valid parent phone number from database
- [ ] Ready to login!

## 🎯 Example .env.local

If your super-admin uses these settings:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Shribi Edufy
DB_USER=postgres
DB_PASSWORD=admin123
```

Then your parent-portal `.env.local` should be:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Shribi Edufy
DB_USER=postgres
DB_PASSWORD=admin123
JWT_SECRET=my-super-secret-jwt-key
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=my-nextauth-secret-key
```

## ✅ Verification Steps

1. **Test Database Connection:**
   - Visit: http://localhost:3001/api/test
   - Should see success message

2. **Test Login:**
   - Visit: http://localhost:3001/login
   - Enter valid phone number
   - Password: `parent123`
   - Should redirect to dashboard

3. **Check Server Logs:**
   - Look for console.log messages in terminal
   - Should see "Login attempt received"
   - Should see "Students found: X"
   - Should see "Token created successfully"

## 📞 Need Help?

If you're still having issues:
1. Check server terminal for error messages
2. Check browser console (F12) for errors
3. Verify database credentials are correct
4. Ensure PostgreSQL is running
5. Test with /api/test endpoint first

---
**Last Updated:** October 13, 2025

