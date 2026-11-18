import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

export const supabaseConfig = {
  get url() {
    return process.env.SUPABASE_URL || "";
  },
  get anonKey() {
    return process.env.SUPABASE_ANON_KEY || "";
  },
  get serviceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  },
};

const supabaseUrl = supabaseConfig.url;
const supabaseKey = supabaseConfig.anonKey || supabaseConfig.serviceRoleKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Warning: SUPABASE_URL hoặc SUPABASE_KEY chưa được cấu hình trong file .env!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const adminKey = supabaseConfig.serviceRoleKey || supabaseKey;
export const supabaseAdmin = createClient(supabaseUrl, adminKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default supabase;
