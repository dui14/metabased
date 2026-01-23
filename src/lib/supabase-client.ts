import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client for client-side (chỉ dùng khi USE_LOCAL_DB=false)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
