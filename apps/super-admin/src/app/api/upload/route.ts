import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/webm',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid file type. Only PDF, images (JPEG, PNG, GIF, WebP), and videos (MP4, MPEG, MOV, WebM) are allowed.' 
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    const folderParam = request.nextUrl.searchParams.get('folder');
    const allowedFolders = ['homework', 'students', 'student-documents', 'staff-documents', 'reports'];
    const folder = allowedFolders.includes(folderParam || '')
      ? (folderParam as string)
      : 'homework';

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedFilename}`;
    const filepath = path.join(uploadDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public URL
    const fileUrl = `/uploads/${folder}/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
      },
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

























































