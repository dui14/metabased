import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from './supabase';

/**
 * Get Supabase client cho API routes với error handling
 * @returns Supabase client hoặc throw error nếu không khả dụng
 */
export function getSupabaseForApi() {
  const supabase = createServerSupabaseClient();
  
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  return supabase;
}

/**
 * Wrapper để xử lý lỗi database configuration
 */
export function withDatabase<T>(
  handler: (supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const supabase = getSupabaseForApi();
    return handler(supabase);
  } catch (error) {
    if (error instanceof Error && error.message === 'Database not configured') {
      return Promise.resolve(
        NextResponse.json(
          { error: 'Database not configured' },
          { status: 500 }
        )
      );
    }
    throw error;
  }
}
