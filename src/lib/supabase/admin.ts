import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client for server-only privileged operations (portal downloads).
 * Never import into client components.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for privileged document downloads",
    );
  }

  return createClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
