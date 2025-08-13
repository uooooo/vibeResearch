import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function createRouteUserClient() {
  const store = await cookies();
  return createRouteHandlerClient({ cookies: () => store });
}
