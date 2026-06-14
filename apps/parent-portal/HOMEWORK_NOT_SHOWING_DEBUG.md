# Homework Not Showing - Debug Guide

## 🔍 Issue
Homework not displaying on parent portal: `http://localhost:3001/homework/1`

## 🎯 Root Cause Analysis

### **Most Likely Issues:**

1. **Student doesn't have `status = 'active'`**
   - When homework is assigned in super-admin, it creates homework_submissions only for students with `status = 'active'`
   - Kuldeep Singh might not have this status set

2. **Student's `class_id` is NULL or doesn't match homework class**
   - Homework is assigned to class 5
   - Kuldeep might not have `class_id = 5` set

3. **No homework_submissions created for the student**
   - Even though homework exists for class 5
   - Submission records weren't created for this student

---

## 🔧 How to Debug

### **Step 1: Check Terminal Logs**

1. Go to parent-portal terminal
2. Refresh the homework page: `http://localhost:3001/homework/1`
3. Look for these logs:

```
=== Homework API Called ===
Student ID: 1
Student query result: [ { class_id: 5 } ]  ← Should show class_id
Student class_id: 5                         ← Should show the class
Homework query result count: 0              ← Currently 0, should be > 0
Homework data: []                           ← Currently empty
```

**What to check:**
- ✅ Is `class_id` showing correctly?
- ✅ Is homework count > 0?
- ✅ Is homework data returned?

---

### **Step 2: Run Database Diagnostic**

Run this SQL file to check the database:
```bash
cd apps/parent-portal
psql -U postgres -d Shribi Edufy_db -f check-homework-debug.sql
```

Or run each query individually in pgAdmin:

#### **Query 1: Check Kuldeep's Record**
```sql
SELECT id, first_name, last_name, class_id, status 
FROM students 
WHERE id = 1;
```

**Expected:**
```
id | first_name | last_name | class_id | status
1  | Kuldeep    | Singh     | 5        | active
```

**If `class_id` is NULL:**
```sql
UPDATE students SET class_id = 5 WHERE id = 1;
```

**If `status` is not 'active':**
```sql
UPDATE students SET status = 'active' WHERE id = 1;
```

---

#### **Query 2: Check Homework Assignments**
```sql
SELECT id, title, class_id, subject_id, due_date, assigned_date, status
FROM homework
ORDER BY created_at DESC;
```

**Should show:**
```
id | title                        | class_id | subject_id | due_date   | status
1  | Computer Science Assignment  | 5        | 1          | 2025-10-14 | active
```

---

#### **Query 3: Check Homework Submissions for Kuldeep**
```sql
SELECT hs.*, h.title as homework_title
FROM homework_submissions hs
JOIN homework h ON hs.homework_id = h.id
WHERE hs.student_id = 1;
```

**Expected:**
```
id | homework_id | student_id | status  | homework_title
1  | 1           | 1          | pending | Computer Science Assignment
```

**If NO ROWS:**
This is the problem! Submissions weren't created for Kuldeep.

---

#### **Query 4: Check All Students in Class 5**
```sql
SELECT id, first_name, last_name, class_id, status
FROM students
WHERE class_id = 5;
```

**Should include Kuldeep:**
```
id | first_name | last_name | class_id | status
1  | Kuldeep    | Singh     | 5        | active
```

---

## 🔨 Fixes

### **Fix 1: Update Student Status**

If Kuldeep doesn't have `status = 'active'`:

```sql
UPDATE students 
SET status = 'active' 
WHERE id = 1;
```

---

### **Fix 2: Set Class ID**

If Kuldeep's `class_id` is NULL:

```sql
UPDATE students 
SET class_id = 5 
WHERE id = 1;
```

---

### **Fix 3: Create Missing Homework Submissions**

If homework exists but submissions weren't created for Kuldeep:

```sql
-- Get all homework for class 5
-- Create submissions for Kuldeep (student_id = 1)

INSERT INTO homework_submissions (homework_id, student_id, status)
SELECT h.id, 1, 'pending'
FROM homework h
WHERE h.class_id = 5
AND NOT EXISTS (
  SELECT 1 FROM homework_submissions hs 
  WHERE hs.homework_id = h.id AND hs.student_id = 1
);
```

This will create pending submissions for all class 5 homework for Kuldeep.

---

### **Fix 4: Complete Student Setup Script**

Run all fixes at once:

```sql
-- Update Kuldeep's student record
UPDATE students 
SET 
  class_id = 5,
  status = 'active'
WHERE id = 1;

-- Create homework submissions for all existing homework
INSERT INTO homework_submissions (homework_id, student_id, status)
SELECT h.id, 1, 'pending'
FROM homework h
WHERE h.class_id = 5
AND NOT EXISTS (
  SELECT 1 FROM homework_submissions hs 
  WHERE hs.homework_id = h.id AND hs.student_id = 1
);
```

---

## ✅ Verify the Fix

### **Step 1: Check Database**
```sql
-- Should return homework with submission data
SELECT 
  h.*,
  s.name as subject_name,
  hs.id as submission_id,
  hs.status as submission_status
FROM homework h
LEFT JOIN subjects s ON h.subject_id = s.id
LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = 1
WHERE h.class_id = 5;
```

**Expected:**
```
id | title                | subject_name      | submission_id | submission_status
1  | CS Assignment       | Computer Science  | 1             | pending
```

---

### **Step 2: Test API**

Refresh the homework page and check terminal logs:

```
=== Homework API Called ===
Student ID: 1
Student query result: [ { class_id: 5 } ]
Student class_id: 5
Homework query result count: 1              ← Should be > 0 now!
Homework data: [
  {
    "id": 1,
    "title": "Computer Science Assignment",
    "subject_name": "Computer Science",
    "submission_id": 1,
    "submission_status": "pending",
    ...
  }
]
```

---

### **Step 3: Test UI**

1. Go to: `http://localhost:3001/homework/1`
2. ✅ Should show "Total Assignments: 1"
3. ✅ Should show "Pending: 1"
4. ✅ Should display homework card
5. ✅ Can click "Submit Homework" button

---

## 📊 Summary

**Most Common Issue:**
- Student doesn't have `status = 'active'`
- Homework submissions are only created for active students

**Quick Fix:**
```sql
UPDATE students SET status = 'active', class_id = 5 WHERE id = 1;

INSERT INTO homework_submissions (homework_id, student_id, status)
SELECT h.id, 1, 'pending'
FROM homework h
WHERE h.class_id = 5
AND NOT EXISTS (
  SELECT 1 FROM homework_submissions hs 
  WHERE hs.homework_id = h.id AND hs.student_id = 1
);
```

**Verify:**
- Refresh homework page
- Check terminal logs
- See homework displayed in UI

---

## 🎯 Next Steps

1. **Check terminal logs** - What does the API return?
2. **Run diagnostic SQL** - What's in the database?
3. **Apply fixes** - Update student record and create submissions
4. **Verify** - Refresh and test

---

**Created:** October 2025  
**Issue:** Homework not displaying on parent portal  
**Status:** Diagnosis Complete - Awaiting User Action

