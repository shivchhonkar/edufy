# Homework File Upload Feature & Database Fix

## Overview
Fixed the "attachments column does not exist" error and added complete file upload functionality for PDFs, images, and videos.

---

## 🔧 Quick Fix for Database Error

### Run This SQL First:
```bash
psql -U postgres -d Shribi Edufy -f DATABASE_HOMEWORK_FIX.sql
```

This will:
- ✅ Add `attachments` column to `homework` table (if missing)
- ✅ Add `submission_files` column to `homework_submissions` table
- ✅ Verify columns were added successfully

**Alternative - Manual SQL:**
```sql
-- Add attachments column
ALTER TABLE homework ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Add submission files column
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_files JSONB;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'homework' AND column_name = 'attachments';
```

---

## 📁 File Upload Feature

### Supported File Types
- **PDFs** - `.pdf`
- **Images** - `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **Videos** - `.mp4`, `.mov`, `.mpeg`, `.webm`

### File Size Limit
- **Maximum:** 50MB per file
- **Multiple files:** Upload multiple files at once

---

## 🎯 How to Use

### 1. **Assign Homework with Attachments**

1. Click **"Assign Homework"** button
2. Fill in the form (Class, Subject, Title, etc.)
3. **Upload Files:**
   - Click the upload area or drag & drop files
   - Multiple files can be selected at once
   - See upload progress while files are being uploaded
4. **Review Attachments:**
   - See thumbnails for images
   - See file icons for PDFs and videos
   - File size displayed for each
5. **Remove Files:** Click the X button to remove any attachment
6. Click **"Assign Homework"** to save

### 2. **Visual Preview**

**Images:**
- Thumbnail preview shown
- Click to view full size

**Videos:**
- Video icon shown
- File name and size displayed

**PDFs:**
- PDF icon shown
- File name and size displayed

---

## 🔄 API Changes

### New Upload Endpoint: `/api/upload`

**POST Request:**
```javascript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "/uploads/homework/1729123456-filename.pdf",
    "filename": "filename.pdf",
    "size": 1024000,
    "type": "application/pdf"
  },
  "message": "File uploaded successfully"
}
```

### Updated Homework API

**Attachments in Payload:**
```json
{
  "class_id": 1,
  "subject_id": 2,
  "title": "Math Assignment",
  "description": "Complete the exercises",
  "due_date": "2025-10-25",
  "total_marks": 100,
  "attachments": [
    {
      "url": "/uploads/homework/123-file.pdf",
      "filename": "assignment.pdf",
      "size": 1024000,
      "type": "application/pdf"
    }
  ]
}
```

---

## 📂 File Storage

### Directory Structure
```
public/
└── uploads/
    └── homework/
        ├── 1729123456-math_worksheet.pdf
        ├── 1729123457-diagram.png
        └── 1729123458-tutorial.mp4
```

### File Naming
- **Format:** `timestamp-sanitized_filename.ext`
- **Example:** `1729123456-math_assignment.pdf`
- **Sanitization:** Special characters replaced with underscores

---

## 🔒 Security Features

### 1. **File Type Validation**
Only allowed file types can be uploaded:
```typescript
const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
];
```

### 2. **File Size Validation**
- Maximum 50MB per file
- Server-side validation
- Clear error messages

### 3. **Filename Sanitization**
- Special characters removed
- Spaces replaced with underscores
- Unique timestamp prefix

---

## 🎨 UI Components

### Upload Area
```
┌──────────────────────────────────────┐
│         📁 Upload Icon               │
│                                      │
│  Click to upload or drag and drop   │
│  PDF, Images, Videos up to 50MB     │
└──────────────────────────────────────┘
```

### Attachment List
```
┌──────────────────────────────────────┐
│  📄 assignment.pdf         50 KB  ✖  │
│  🖼️ diagram.png           120 KB  ✖  │
│  🎥 tutorial.mp4          2.5 MB  ✖  │
└──────────────────────────────────────┘
```

---

## 🔄 API Error Handling

### Upload API Handles:
1. **No file uploaded** → 400 error
2. **Invalid file type** → 400 error with allowed types
3. **File too large** → 400 error with size limit
4. **Upload failure** → 500 error with details

### Homework API Handles:
1. **Missing attachments column** → Gracefully skips
2. **Invalid JSON** → Catches and logs error
3. **Database error** → Returns proper error message

---

## 🚀 Features Implemented

### Backend:
- ✅ `/api/upload` endpoint for file uploads
- ✅ File type validation
- ✅ File size validation
- ✅ Unique filename generation
- ✅ Directory creation
- ✅ Error handling

### Frontend:
- ✅ File upload input with drag & drop
- ✅ Multiple file selection
- ✅ Upload progress indicator
- ✅ Visual file previews
- ✅ File removal functionality
- ✅ File size display
- ✅ File type icons

### Database:
- ✅ Migration script for missing columns
- ✅ JSONB storage for multiple attachments
- ✅ Backward compatibility

---

## 📊 File Format Details

### Stored in Database (JSONB):
```json
[
  {
    "url": "/uploads/homework/1729123456-file.pdf",
    "filename": "original_filename.pdf",
    "size": 1024000,
    "type": "application/pdf"
  },
  {
    "url": "/uploads/homework/1729123457-image.png",
    "filename": "diagram.png",
    "size": 512000,
    "type": "image/png"
  }
]
```

---

## 🐛 Troubleshooting

### Issue 1: "column attachments does not exist"
**Solution:**
```bash
psql -U postgres -d Shribi Edufy -f DATABASE_HOMEWORK_FIX.sql
```

### Issue 2: Files not uploading
**Check:**
1. Upload directory exists: `public/uploads/homework/`
2. Directory has write permissions
3. File size under 50MB
4. File type is allowed

### Issue 3: Files don't appear
**Check:**
1. Files saved in `public/uploads/homework/`
2. URL starts with `/uploads/homework/`
3. Next.js serving static files from public

### Issue 4: Upload button not responding
**Check:**
1. Browser console for errors
2. Network tab for API call failures
3. File input accept attribute

---

## 📝 Testing Checklist

### Backend API:
✅ Upload PDF file  
✅ Upload image file  
✅ Upload video file  
✅ Upload multiple files  
✅ Reject invalid file type  
✅ Reject oversized file  
✅ Handle missing directory  

### Frontend UI:
✅ Click to select files  
✅ Drag and drop files  
✅ Show upload progress  
✅ Display file previews  
✅ Remove attachments  
✅ Multiple file upload  
✅ Show file size  

### Integration:
✅ Create homework with attachments  
✅ Edit homework (preserve attachments)  
✅ View homework attachments  
✅ Database stores attachments  
✅ Files accessible via URL  

---

## 🔗 File Access

### Accessing Uploaded Files:
```javascript
// In frontend
<a href={file.url} target="_blank">
  {file.filename}
</a>

// Direct URL
http://localhost:3000/uploads/homework/1729123456-file.pdf
```

### Image Preview:
```javascript
<img 
  src={file.url} 
  alt={file.filename} 
  className="w-full h-auto"
/>
```

### Video Player:
```javascript
<video controls>
  <source src={file.url} type={file.type} />
</video>
```

---

## 💡 Best Practices

### For Teachers:
1. **Upload relevant files only** - Keep files under 50MB
2. **Use descriptive filenames** - Students will see these
3. **Multiple files OK** - Upload worksheets, images, videos together
4. **Preview before assigning** - Check all files uploaded correctly

### For Developers:
1. **Validate on both sides** - Client and server validation
2. **Sanitize filenames** - Remove special characters
3. **Use timestamps** - Prevent filename conflicts
4. **Handle errors gracefully** - Show clear error messages
5. **Clean old files** - Implement cleanup script for old uploads

---

## 🔮 Future Enhancements

1. **File Preview Modal**
   - View PDFs inline
   - Image gallery
   - Video player

2. **Cloud Storage**
   - AWS S3 integration
   - CDN for faster delivery
   - Automatic backups

3. **Compression**
   - Auto-compress images
   - Video transcoding
   - PDF optimization

4. **Batch Upload**
   - Upload progress bar
   - Queue management
   - Retry failed uploads

5. **File Management**
   - View all uploaded files
   - Delete unused files
   - Storage statistics

---

## 📁 Files Modified/Created

### Created:
- ✅ `DATABASE_HOMEWORK_FIX.sql` - Database migration
- ✅ `src/app/api/upload/route.ts` - File upload API
- ✅ `FILE_UPLOAD_GUIDE.md` - This documentation

### Modified:
- ✅ `src/app/api/homework/route.ts` - Handles attachments gracefully
- ✅ `src/app/homework/page.tsx` - Added file upload UI

### Directory Created:
- ✅ `public/uploads/homework/` - File storage (auto-created)

---

## ✅ Summary

**Status:** ✅ Complete and Production Ready

**Fixed:**
- Database column error
- Backward compatibility

**Added:**
- File upload API
- Multi-file support
- Visual previews
- File validation
- Error handling

**Supported:**
- PDFs (up to 50MB)
- Images (JPEG, PNG, GIF, WebP)
- Videos (MP4, MOV, MPEG, WebM)

**Ready to use at:** `http://localhost:3000/homework`

---

## 🚀 Quick Start

```bash
# 1. Fix database
psql -U postgres -d Shribi Edufy -f DATABASE_HOMEWORK_FIX.sql

# 2. Restart server (if running)
npm run dev

# 3. Test file upload
# - Go to http://localhost:3000/homework
# - Click "Assign Homework"
# - Upload files in the attachments section
# - Save and verify
```

---

**Implementation Date:** October 2025  
**Version:** 1.1.0  
**Status:** Production Ready with File Upload Support


























































