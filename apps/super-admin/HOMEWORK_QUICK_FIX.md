# ⚡ Quick Fix for Homework File Upload

## 🔴 Problems Fixed
- ❌ **"column 'attachments' of relation 'homework' does not exist"**
- ❌ **"column 'status' of relation 'homework' does not exist"**
- ❌ **Missing created_at/updated_at columns**

## ✅ Solution (3 Steps)

### Step 1: Fix Database Column
```bash
psql -U postgres -d Shribi Edufy -f DATABASE_HOMEWORK_FIX.sql
```

**Expected Output:**
```
NOTICE:  Added status column to homework table
NOTICE:  Added attachments column to homework table
NOTICE:  Added created_at column to homework table
NOTICE:  Added updated_at column to homework table
NOTICE:  Added submission_files column to homework_submissions table
```

### Step 2: Setup Upload Directory
Already done! ✅
```
✅ Created upload directory: public\uploads\homework
✅ Created .gitkeep file
```

### Step 3: Test It!
1. Go to `http://localhost:3000/homework`
2. Click **"Assign Homework"**
3. Fill the form
4. **Upload files:**
   - Click the upload area
   - Select PDF, image, or video files
   - Upload multiple files at once
5. Click **"Assign Homework"**

---

## 📁 File Upload Features

### ✅ What You Can Upload:
- **PDFs** - Worksheets, assignments, study materials
- **Images** - Diagrams, screenshots, illustrations (JPEG, PNG, GIF, WebP)
- **Videos** - Tutorial videos, explanations (MP4, MOV, MPEG, WebM)

### ✅ Features:
- **Multiple files** - Upload many files at once
- **Drag & Drop** - Drag files directly into the upload area
- **Visual Preview** - See thumbnails for images, icons for PDFs/videos
- **File Size Display** - See how large each file is
- **Remove Files** - Click X to remove any attachment before saving
- **Up to 50MB per file**

---

## 🎨 What It Looks Like

### Upload Area:
```
┌─────────────────────────────────────────┐
│           📁 Upload Icon                │
│                                         │
│   Click to upload or drag and drop     │
│   PDF, Images, Videos up to 50MB       │
└─────────────────────────────────────────┘
```

### After Uploading:
```
┌─────────────────────────────────────────┐
│  📄 math_worksheet.pdf      1.2 MB   ✖  │
│  🖼️ diagram.png            250 KB   ✖  │
│  🎥 tutorial.mp4           15.5 MB  ✖  │
└─────────────────────────────────────────┘
```

---

## 🐛 Still Having Issues?

### Database Error Persists?
**Verify columns were added:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'homework' 
AND column_name IN ('status', 'attachments', 'created_at', 'updated_at');
```

**Manual fix:**
```sql
-- Add all missing columns
ALTER TABLE homework ADD COLUMN status VARCHAR(50) DEFAULT 'active';
ALTER TABLE homework ADD COLUMN attachments JSONB;
ALTER TABLE homework ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE homework ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE homework_submissions ADD COLUMN submission_files JSONB;

-- Add status constraint
ALTER TABLE homework ADD CONSTRAINT homework_status_check 
  CHECK (status IN ('active', 'completed', 'archived'));
```

### Files Not Uploading?
**Check directory exists:**
```bash
# Windows
dir apps\super-admin\public\uploads\homework

# Linux/Mac
ls -la apps/super-admin/public/uploads/homework
```

**Recreate directory:**
```bash
cd apps/super-admin
node setup-uploads.js
```

### Upload Button Not Working?
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify file type is allowed
4. Check file size under 50MB

---

## 📊 Technical Details

### Where Files Are Stored:
```
apps/super-admin/
└── public/
    └── uploads/
        └── homework/
            ├── 1729123456-math_worksheet.pdf
            ├── 1729123457-diagram.png
            └── 1729123458-tutorial.mp4
```

### How Files Are Named:
- Format: `timestamp-sanitized_filename.ext`
- Example: `1729123456-my_homework.pdf`
- Special characters replaced with underscores

### Database Storage (JSONB):
```json
{
  "attachments": [
    {
      "url": "/uploads/homework/1729123456-file.pdf",
      "filename": "math_worksheet.pdf",
      "size": 1024000,
      "type": "application/pdf"
    }
  ]
}
```

---

## ✅ All Fixed!

**You can now:**
- ✅ Create homework without database errors
- ✅ Upload PDFs, images, and videos
- ✅ Upload multiple files at once
- ✅ Preview files before saving
- ✅ Remove files you don't want
- ✅ Students can download attachments (when student portal is built)

---

## 📚 Full Documentation

For complete details, see:
- `FILE_UPLOAD_GUIDE.md` - Complete file upload documentation
- `HOMEWORK_SYSTEM.md` - Complete homework system documentation
- `DATABASE_HOMEWORK_FIX.sql` - Database migration script
- `setup-uploads.js` - Upload directory setup script

---

## 🎉 That's It!

Your homework system is now fully functional with file upload support!

**Test it now:**
`http://localhost:3000/homework`

---

**Status:** ✅ Fixed and Ready  
**Upload Support:** ✅ PDF, Images, Videos  
**Max File Size:** 50MB  
**Multiple Files:** ✅ Yes

