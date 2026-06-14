# 🚨 HOMEWORK DATABASE FIX - Run This Now

## ❌ Errors You're Getting:
- "column 'status' of relation 'homework' does not exist"
- "column 'attachments' of relation 'homework' does not exist"
- "null value in column 'assigned_date' of relation 'homework' violates not-null constraint"

## ✅ ONE COMMAND FIX:

```bash
psql -U postgres -d Shribi Edufy -f apps/super-admin/DATABASE_HOMEWORK_FIX.sql
```

**OR if you're in super-admin directory:**
```bash
psql -U postgres -d Shribi Edufy -f DATABASE_HOMEWORK_FIX.sql
```

## ✅ What This Does:
Adds/fixes these columns in your `homework` table:
- ✅ `status` (VARCHAR) - for tracking active/completed/archived
- ✅ `attachments` (JSONB) - for file uploads
- ✅ `created_at` (TIMESTAMP) - when homework was created
- ✅ `updated_at` (TIMESTAMP) - when homework was last updated
- ✅ `assigned_date` (TIMESTAMP) - when homework was assigned (removes NOT NULL constraint)
- ✅ `submission_files` (JSONB) - for student file submissions

## ✅ Expected Output:
```
NOTICE:  Added status column to homework table
NOTICE:  Added attachments column to homework table
NOTICE:  Added created_at column to homework table
NOTICE:  Added updated_at column to homework table
NOTICE:  Fixed assigned_date column to be nullable with default
NOTICE:  Added submission_files column to homework_submissions table
```

## ✅ Then Test:
1. Restart your server (if needed): `npm run dev`
2. Go to: `http://localhost:3000/homework`
3. Click **"Assign Homework"**
4. Fill the form and upload files
5. ✅ It should work now!

---

## 🔧 Alternative: Manual SQL (if above doesn't work)

```sql
-- Connect to your database first
psql -U postgres -d Shribi Edufy

-- Then run these commands one by one:

ALTER TABLE homework ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE homework ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_files JSONB;

-- Fix assigned_date if it exists with NOT NULL constraint
ALTER TABLE homework ALTER COLUMN assigned_date DROP NOT NULL;
ALTER TABLE homework ALTER COLUMN assigned_date SET DEFAULT CURRENT_TIMESTAMP;

-- Add constraint
ALTER TABLE homework ADD CONSTRAINT homework_status_check 
  CHECK (status IN ('active', 'completed', 'archived'));

-- Verify
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'homework' 
AND column_name IN ('status', 'attachments', 'created_at', 'updated_at', 'assigned_date');
```

---

## ✅ All Fixed!

Your homework system will now:
- ✅ Work without database errors
- ✅ Allow file uploads (PDF, images, videos)
- ✅ Track homework status properly
- ✅ Store creation/update timestamps

**Access it at:** `http://localhost:3000/homework`

---

## 📚 More Help?
- `HOMEWORK_QUICK_FIX.md` - Detailed troubleshooting
- `FILE_UPLOAD_GUIDE.md` - Complete file upload guide
- `HOMEWORK_SYSTEM.md` - Full system documentation

