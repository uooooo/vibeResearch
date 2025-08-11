import { createClient } from "@supabase/supabase-js";

export function supabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

