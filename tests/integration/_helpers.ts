import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export function getIntegrationEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { url, publishableKey, serviceRoleKey };
}

export function canRunIntegration(): boolean {
  const { url, publishableKey, serviceRoleKey } = getIntegrationEnv();
  return Boolean(url && publishableKey && serviceRoleKey);
}

/**
 * Secretless CI may skip. Release gate sets INTEGRATION_REQUIRED=1 so missing
 * credentials fail the job instead of silently skipping.
 */
export function assertIntegrationAvailable(): void {
  if (canRunIntegration()) {
    return;
  }

  if (process.env.INTEGRATION_REQUIRED === "1") {
    throw new Error(
      "INTEGRATION_REQUIRED=1 but Supabase credentials are missing. Configure local Supabase or repository secrets.",
    );
  }
}

export async function createAuthedUser(
  admin: SupabaseClient<Database>,
  email: string,
  password: string,
  url: string,
  publishableKey: string,
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0] },
  });
  if (error || !data.user) {
    throw error ?? new Error("Failed to create user");
  }

  const userClient = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    throw signInError;
  }

  return { user: data.user, client: userClient };
}
