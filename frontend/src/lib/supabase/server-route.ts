import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Use the recommended pattern from auth-helpers: pass a function that calls cookies() lazily.
export function createRouteUserClient() {
  return createRouteHandlerClient({ cookies });
}
