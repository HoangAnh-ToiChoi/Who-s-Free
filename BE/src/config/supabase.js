import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Cảnh báo: Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env');
}

// Client dùng key anon (cho các thao tác thông thường)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin dùng service_role key (dùng để verify token ở middleware auth)
export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey
);