# Dashboard Homework Debug Guide

## ✅ Changes Made

Updated the dashboard stats API to:
1. ✅ Use `pool.query` directly (same as super-admin)
2. ✅ Added extensive console logging
3. ✅ Removed `AND h.status = 'active'` filter to catch all homework
4. ✅ Added debug query to see ALL homework for the class

---

## 🔍 How to Debug

### **Step 1: Open Browser Console**
```
1. Open parent portal: http://localhost:3001/dashboard
2. Press F12 (open Developer Tools)
3. Go to "Console" tab
4. Select Kuldeep Singh
5. Watch for console logs
```

### **Step 2: Check Terminal/Server Logs**
```
Look for these console.log outputs in your server terminal:

1. "Student class result:" - Shows student's class
2. "Student class ID:" - Shows the class ID
3. "All homework for class:" - Shows ALL homework for Class 5
4. "Homework stats result:" - Shows the count results
```

---

## 🎯 What to Look For

### **In Console/Terminal:**

#### **1. Student Class Result:**
```javascript
Student class result: [ { class_id: 3 } ]  // or whatever Kuldeep's class_id is
```
Expected: Should show Kuldeep's class_id (probably 3 for Class 5)

#### **2. All Homework for Class:**
```javascript
All homework for class: [
  {
    id: 1,
    title: 'Computer Science - Assignment',
    class_id: 3,
    status: 'active'
  }
]
```
Expected: Should show the homework you created for Class 5

#### **3. Homework Stats Result:**
```javascript
Homework stats result: [
  {
    pending: '1',
    submitted: '0',
    graded: '0',
    total: '1'
  }
]
```
Expected: Should show 1 pending homework

---

## 🔴 Possible Issues & Solutions

### **Issue 1: Class ID Mismatch**

**Console shows:**
```
Student class ID: 5
All homework for class: []  // Empty!
```

**Problem:** Kuldeep Singh might be in a different class than you think.

**Solution:**
```sql
-- Check Kuldeep's actual class
SELECT id, first_name, last_name, class_id 
FROM students 
WHERE first_name = 'Kuldeep';

-- Check what homework exists
SELECT h.id, h.title, h.class_id, c.name as class_name
FROM homework h
LEFT JOIN classes c ON c.id = h.class_id;
```

---

### **Issue 2: No Submissions Created**

**Console shows:**
```
All homework for class: [ { id: 1, title: '...', class_id: 3 } ]
Homework stats result: [ { pending: '0', submitted: '0', graded: '0', total: '0' } ]
```

**Problem:** Homework exists but no submissions were created for Kuldeep.

**Solution:**
```sql
-- Check if submission exists
SELECT * FROM homework_submissions 
WHERE student_id = {kuldeep_id} 
AND homework_id = {homework_id};

-- If missing, create it manually:
INSERT INTO homework_submissions (homework_id, student_id, status)
VALUES ({homework_id}, {kuldeep_id}, 'pending');
```

---

### **Issue 3: Different Database**

**Console shows nothing or errors**

**Problem:** Parent portal might be connecting to different database.

**Solution:**
Check `.env` files:
```bash
# In apps/parent-portal/.env.local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Shribi Edufy  # ← Should be same as super-admin
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## 🔧 Quick Fixes

### **Fix 1: Verify Student's Class**
```sql
-- Find Kuldeep's student ID and class
SELECT id, first_name, last_name, class_id, admission_number
FROM students
WHERE first_name LIKE '%Kuldeep%';

-- Result should match the dashboard (ADM20252072)
```

### **Fix 2: Check Homework**
```sql
-- See all homework for Kuldeep's class
SELECT h.*, c.name as class_name
FROM homework h
LEFT JOIN classes c ON c.id = h.class_id
WHERE c.name = 'Class 5';
```

### **Fix 3: Check/Create Submissions**
```sql
-- Check submissions for Kuldeep
SELECT hs.*, h.title
FROM homework_submissions hs
JOIN homework h ON h.id = hs.homework_id
WHERE hs.student_id = {kuldeep_id};

-- If none exist, the POST /api/homework route should have created them
-- Check if homework was created properly in super-admin
```

---

## 📋 Debugging Checklist

Run through these steps:

### **1. Get Kuldeep's Info:**
```sql
SELECT id, first_name, last_name, class_id, admission_number
FROM students
WHERE admission_number = 'ADM20252072';
```
Note the `id` and `class_id`.

### **2. Check Class Name:**
```sql
SELECT id, name FROM classes WHERE id = {kuldeep_class_id};
```
Should be "Class 5".

### **3. Check Homework for Class:**
```sql
SELECT * FROM homework WHERE class_id = {kuldeep_class_id};
```
Should show the Computer Science homework.

### **4. Check Submissions:**
```sql
SELECT * FROM homework_submissions 
WHERE homework_id = {homework_id} 
AND student_id = {kuldeep_id};
```
Should have 1 row with status='pending'.

### **5. Test the API Directly:**
```bash
curl "http://localhost:3001/api/dashboard/stats?studentId={kuldeep_id}"
```
Check the response JSON for homework.pending value.

---

## 🎯 Expected Behavior

### **Correct Flow:**

1. **Teacher assigns homework** (Super-Admin)
   - Creates row in `homework` table
   - Creates rows in `homework_submissions` for all students in Class 5

2. **Student views dashboard** (Parent Portal)
   - API fetches student's class_id
   - API counts homework for that class
   - API counts submissions where student_id matches

3. **Dashboard displays:**
   ```
   Pending Homework: 1  ✅
   ```

---

## 🚨 What to Check First

1. **Open browser console** (F12)
2. **Refresh dashboard** (select Kuldeep Singh)
3. **Look for console.log output:**
   - Student class result
   - All homework for class
   - Homework stats result

4. **If homework shows in "All homework for class":**
   - ✅ Homework exists
   - ✅ Class ID is correct
   - ❌ Issue is with submissions count

5. **If "All homework for class" is empty:**
   - ❌ Class ID mismatch
   - ❌ Homework not in database
   - ❌ Database connection issue

---

## 📝 Next Steps

1. **Check the logs** in console/terminal
2. **Share the console.log output** with me
3. **Run the SQL queries** above to verify data
4. **Check the homework_submissions table** for Kuldeep

---

**File Updated:** `apps/parent-portal/src/app/api/dashboard/stats/route.ts`

**Changes:**
- Switched from `query()` to `pool.query()` (same as super-admin)
- Added debug logging
- Removed status filter to see all homework
- Added query to list ALL homework for the class

**Status:** ✅ Ready for debugging


























































