import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Next.js 15+ requires awaiting cookies() before use.
// Return a client wired to a resolved cookie store via a lazy function.
export async function createRouteUserClient() {
  const store = await cookies();
  return createRouteHandlerClient({ cookies: () => store });
}
