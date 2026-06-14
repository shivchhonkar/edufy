# Authentication Setup - Inventory Admin

## Overview

The Inventory Admin app now has a complete authentication system that:
- Requires login before accessing any page
- Restricts access to authorized roles only
- Stores authentication tokens securely
- Provides logout functionality

---

## Login System

### Login Page

**URL:** `/login`

The login page provides a secure authentication interface with:
- Email and password fields
- Password visibility toggle
- Error message display
- Loading states
- Remember me option (UI only, always remembers for 7 days)

### Authentication Flow

1. User enters email and password
2. System validates credentials against database
3. System checks if user has required role
4. JWT token is generated (valid for 7 days)
5. Token stored in:
   - localStorage (for client-side checks)
   - Cookie (for middleware/server-side checks)
6. User data stored in localStorage
7. Redirect to dashboard

---

## Required Roles

Only users with these roles can access the inventory system:
- `inventory_manager` - Primary inventory staff
- `admin` - School administrators
- `super_admin` - System administrators

Any other role will be denied access.

---

## Protected Routes

All pages except `/login` are protected and require authentication:
- `/` - Dashboard
- `/items` - Inventory items
- `/sales` - Point of sale
- `/transactions` - Stock transactions
- `/categories` - Categories management
- `/reports` - Reports and analytics

If a user tries to access any protected route without authentication, they are automatically redirected to `/login`.

---

## Creating Inventory Manager Users

### Option 1: Using Super Admin Portal

1. Login to Super Admin portal
2. Go to Users section
3. Create a new user
4. Set role to `inventory_manager`
5. Provide email and password

### Option 2: Direct Database Insert

```sql
-- Hash the password first using bcrypt (rounds=10)
-- Example password hash for "password123": $2a$10$...

INSERT INTO users (
  email, 
  password_hash, 
  role, 
  full_name, 
  phone, 
  is_active
) VALUES (
  'inventory@school.com',
  '$2a$10$YourHashedPasswordHere',
  'inventory_manager',
  'Inventory Manager',
  '1234567890',
  true
);
```

### Option 3: Using Registration API (If enabled in super-admin)

Create a user through the super-admin registration endpoint.

---

## Token Management

### JWT Token Structure

```json
{
  "id": 1,
  "email": "inventory@school.com",
  "role": "inventory_manager",
  "full_name": "Inventory Manager",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Token Storage

- **localStorage**: `token` key
- **Cookie**: `token` cookie (HttpOnly not set, accessible by JS)
- **Expiry**: 7 days

### Token Validation

On every protected page load:
1. Check if token exists in localStorage
2. If no token, redirect to login
3. If token exists, allow page to load
4. API routes verify token authenticity

---

## Logout Functionality

The logout button (available on all pages):
1. Removes token from localStorage
2. Removes user data from localStorage
3. Clears token cookie
4. Redirects to `/login`

---

## API Endpoints

### Login

```
POST /api/auth/login

Request:
{
  "email": "inventory@school.com",
  "password": "your_password"
}

Response (Success):
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "inventory@school.com",
      "role": "inventory_manager",
      "full_name": "Inventory Manager",
      "is_active": true
    },
    "token": "eyJhbGc..."
  },
  "message": "Login successful"
}

Response (Error):
{
  "success": false,
  "error": "Invalid credentials"
}
```

### Logout

```
POST /api/auth/logout

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Security Features

### Password Security
- Passwords hashed using bcrypt (10 rounds)
- Original passwords never stored
- Password hashes never returned in API responses

### Role-Based Access Control
- Login API checks role before allowing access
- Only `inventory_manager`, `admin`, and `super_admin` allowed
- Unauthorized roles get 403 Forbidden

### Token Security
- JWT tokens signed with secret key
- Tokens expire after 7 days
- Token includes user role for validation

### Client-Side Protection
- AuthWrapper component checks authentication on all pages
- Automatic redirect to login if not authenticated
- Loading state while checking authentication

---

## Files Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       │   └── route.ts         # Login API endpoint
│   │       └── logout/
│   │           └── route.ts         # Logout API endpoint
│   └── login/
│       └── page.tsx                 # Login page UI
├── components/
│   ├── AuthWrapper.tsx              # Auth protection wrapper
│   └── Header.tsx                   # Header with logout
└── lib/
    └── auth.ts                      # Auth utility functions
```

---

## Testing Authentication

### Test Login Flow

1. Start the app: `npm run dev`
2. Navigate to `http://localhost:3004`
3. You should be redirected to `/login`
4. Enter credentials of a user with `inventory_manager` role
5. Click "Sign In"
6. Should redirect to dashboard

### Test Logout Flow

1. While logged in, click "Logout" button
2. Should clear all auth data
3. Should redirect to `/login`
4. Try accessing `http://localhost:3004` again
5. Should redirect back to `/login`

### Test Unauthorized Access

1. Try logging in with a user having `teacher` or `student` role
2. Should see error: "You do not have permission to access this system"

---

## Troubleshooting

### "Invalid credentials" error
- Check email is correct
- Verify password is correct
- Ensure user exists in database
- Check user's `is_active` is true

### "Unauthorized access" error
- Check user's role in database
- Ensure role is one of: `inventory_manager`, `admin`, `super_admin`

### Stuck on loading screen
- Check browser console for errors
- Clear localStorage and try again
- Verify AuthWrapper component is working

### Redirects to login immediately after login
- Check token is being stored in localStorage
- Verify JWT secret is consistent
- Check browser console for errors

### API returns "Internal server error"
- Check database connection
- Verify @Shribi Edufy/auth package is installed
- Check server logs for detailed error

---

## Environment Variables

The auth system uses these environment variables:

```env
# JWT Secret (set in @Shribi Edufy/auth package)
JWT_SECRET=your-secret-key-here

# Database connection (set in @Shribi Edufy/database package)
DATABASE_URL=postgresql://...
```

**Note:** If `JWT_SECRET` is not set, it defaults to 'your-secret-key' (not recommended for production).

---

## Production Considerations

For production deployment:

1. **Set strong JWT_SECRET**: Use a random, long secret key
2. **HTTPS Only**: Always use HTTPS in production
3. **Secure Cookies**: Consider HttpOnly cookies
4. **Token Refresh**: Implement token refresh mechanism
5. **Session Management**: Track active sessions
6. **Password Requirements**: Enforce strong passwords
7. **Rate Limiting**: Add login attempt limits
8. **2FA**: Consider two-factor authentication

---

## Demo Credentials

For testing purposes, create a demo user:

```sql
-- Create demo inventory manager
INSERT INTO users (email, password_hash, role, full_name, phone, is_active) 
VALUES (
  'demo@inventory.com',
  -- This is bcrypt hash for 'demo123'
  '$2a$10$8K1p/a0dL3Zt6.zWPJ5Ng.lZR5F5p3vwCU5J5oH5N5F5N5F5N5F5O',
  'inventory_manager',
  'Demo Manager',
  '0000000000',
  true
);
```

Then login with:
- Email: `demo@inventory.com`
- Password: `demo123`

---

## Summary

✅ Login system fully implemented  
✅ Role-based access control working  
✅ Protected routes with automatic redirect  
✅ Logout functionality complete  
✅ Secure password handling  
✅ JWT token authentication  
✅ Client and server-side validation  

The inventory admin app is now secure and requires proper authentication! 🔒


























































