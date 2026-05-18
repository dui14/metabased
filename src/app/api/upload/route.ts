import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POSTS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_POSTS || 'posts';
const AVATARS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_AVATARS || 'avatars';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function getBucketFromRequest(request: NextRequest, formData: FormData): string {
  const fromQuery = request.nextUrl.searchParams.get('bucket');
  const fromBody = formData.get('bucket');
  const requested = (typeof fromQuery === 'string' && fromQuery) || (typeof fromBody === 'string' && fromBody) || 'posts';
  return requested === 'avatars' ? AVATARS_BUCKET : POSTS_BUCKET;
}

function getSafeExtension(fileName: string): string {
  const raw = fileName.split('.').pop()?.toLowerCase() || '';
  return /^[a-z0-9]{1,10}$/.test(raw) ? `.${raw}` : '';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = (formData.get('userId') as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 10MB)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Supabase storage is not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const bucket = getBucketFromRequest(request, formData);
    const extension = getSafeExtension(file.name);
    const objectPath = `${userId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    return NextResponse.json(
      {
        url: data.publicUrl,
        bucket,
        path: objectPath,
        size: file.size,
        type: file.type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
