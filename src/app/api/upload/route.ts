import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { supabase } from '@/lib/supabase-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

// POST /api/upload
// Upload image - support cả local storage và Supabase
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    if (useLocalDb) {
      // Local storage - save to public/uploads folder
      const uploadDir = join(process.cwd(), 'src', 'public', 'uploads', 'posts');
      
      // Create directory if it doesn't exist
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const fullPath = join(uploadDir, fileName);
      await writeFile(fullPath, buffer);

      // Return public URL for local file
      const publicUrl = `/uploads/posts/${fileName}`;
      
      return NextResponse.json({ 
        success: true, 
        url: publicUrl,
        message: 'Image uploaded successfully (local storage)'
      });
    } else {
      // Supabase Storage
      if (!supabase) {
        return NextResponse.json(
          { error: 'Supabase not configured' },
          { status: 500 }
        );
      }

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return NextResponse.json(
          { error: `Failed to upload image: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return NextResponse.json({ 
        success: true, 
        url: data.publicUrl,
        message: 'Image uploaded successfully (Supabase Storage)'
      });
    }
  } catch (error) {
    console.error('Error in POST /api/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
