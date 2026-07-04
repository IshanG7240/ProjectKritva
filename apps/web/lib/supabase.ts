import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Singleton Supabase browser client — import this instead of creating new instances. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
