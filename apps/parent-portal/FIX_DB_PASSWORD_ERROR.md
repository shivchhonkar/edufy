# Fix: "client password must be a string" Error

## 🔴 Problem
You're getting this error when trying to login:
```
An error occurred during login: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

## ✅ Solution

This error means your `.env.local` file either:
1. Doesn't exist
2. Has an empty or missing `DB_PASSWORD`
3. Isn't being read by Next.js

### Step-by-Step Fix:

#### Option 1: Create .env.local with Correct Password

1. **Find your PostgreSQL password:**

   Your PostgreSQL password is likely one of these:
   - `postgres` (default)
   - `admin`
   - `root`
   - The password you set during PostgreSQL installation
   - Check your super-admin app if it's running

2. **Create the .env.local file:**

   Create this file: `C:\Shiv\projects\Shribi Edufy-Monorepo\apps\parent-portal\.env.local`

   Add this content:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=Shribi Edufy
   DB_USER=postgres
   DB_PASSWORD=postgres
   JWT_SECRET=my-super-secret-jwt-key-12345
   NEXTAUTH_URL=http://localhost:3001
   NEXTAUTH_SECRET=my-nextauth-secret-key-67890
   ```

   **Replace `postgres` in `DB_PASSWORD=postgres` with your actual PostgreSQL password!**

3. **Restart the dev server:**
   ```
   Press Ctrl+C to stop the current server
   Then run: npm run dev:parent-portal
   ```

#### Option 2: Test Different Passwords

If you're not sure what your password is, try these common ones:

**Test 1: Default password "postgres"**
```env
DB_PASSWORD=postgres
```

**Test 2: Empty password**
```env
DB_PASSWORD=
```

**Test 3: Password "admin"**
```env
DB_PASSWORD=admin
```

**Test 4: Check your super-admin database connection**

Look for how super-admin connects to the database:
```
C:\Shiv\projects\Shribi Edufy\src\lib\db.ts
```

Or check the old Shribi Edufy app's env file:
```
C:\Shiv\projects\Shribi Edufy\.env.local
```

### How to Find Your PostgreSQL Password:

#### Method 1: Connect via Command Line
Open Command Prompt and try:
```bash
psql -U postgres -d Shribi Edufy
```

If it asks for a password, that's the password you need to use.

#### Method 2: Check pgAdmin
If you have pgAdmin installed:
1. Open pgAdmin
2. Connect to localhost
3. The password you use there is your DB password

#### Method 3: Check Original App
Check your super-admin app's database connection:
```
C:\Shiv\projects\Shribi Edufy-Monorepo\apps\super-admin\src\lib\db.ts
```

Look for how it connects to PostgreSQL.

### Verification Steps:

After creating `.env.local`:

1. **Restart dev server:**
   ```
   Ctrl+C
   npm run dev:parent-portal
   ```

2. **Check server logs:**
   You should see:
   ```
   Database configuration: {
     host: 'localhost',
     port: '5432',
     database: 'Shribi Edufy',
     user: 'postgres',
     passwordConfigured: true  <-- Should be true!
   }
   ```

3. **Test database connection:**
   Visit: http://localhost:3001/api/test
   
   Should see:
   ```json
   {
     "success": true,
     "message": "Database connection successful",
     ...
   }
   ```

4. **Try logging in:**
   - Phone: 9999999999
   - Password: parent123

### Still Not Working?

If you still get the error:

1. **Double-check file location:**
   ```
   C:\Shiv\projects\Shribi Edufy-Monorepo\apps\parent-portal\.env.local
   ```
   (Note: File should be in `apps\parent-portal\` directory, NOT in the root!)

2. **Check file content:**
   Make sure there are NO spaces around the `=` sign:
   ```env
   # CORRECT:
   DB_PASSWORD=postgres

   # WRONG:
   DB_PASSWORD = postgres
   DB_PASSWORD= postgres
   DB_PASSWORD =postgres
   ```

3. **Check for quotes:**
   Don't use quotes unless your password actually has them:
   ```env
   # CORRECT:
   DB_PASSWORD=postgres

   # WRONG (unless your password is literally "postgres" with quotes):
   DB_PASSWORD="postgres"
   DB_PASSWORD='postgres'
   ```

4. **Restart COMPLETELY:**
   ```
   Close terminal
   Open new terminal
   cd C:\Shiv\projects\Shribi Edufy-Monorepo
   npm run dev:parent-portal
   ```

## 🎯 Quick Test

After fixing, verify these in order:

```
✅ Step 1: .env.local file exists
✅ Step 2: DB_PASSWORD is set (not empty)
✅ Step 3: Dev server restarted
✅ Step 4: Server logs show "passwordConfigured: true"
✅ Step 5: /api/test returns success
✅ Step 6: Login works!
```

## 📋 Example .env.local

Here's a complete example (update password):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Shribi Edufy
DB_USER=postgres
DB_PASSWORD=your_actual_password_here

# JWT Configuration  
JWT_SECRET=my-super-secret-jwt-key-12345

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=my-nextauth-secret-key-67890
```

**Remember to replace `your_actual_password_here`!**

---

**Need More Help?**

Share:
1. What you see in server logs when you visit /api/test
2. Whether "passwordConfigured" shows as `true` or `false`
3. The exact error message

---
Last Updated: October 13, 2025



























































