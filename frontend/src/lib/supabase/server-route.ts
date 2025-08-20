import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export function createRouteUserClient() {
  const store = cookies();
  return createRouteHandlerClient({ cookies: () => store });
}
