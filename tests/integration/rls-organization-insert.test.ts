import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(url && publishableKey && serviceRoleKey);

async function createAuthedUser(
  admin: SupabaseClient<Database>,
  email: string,
  password: string,
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

  const userClient = createClient<Database>(url!, publishableKey!, {
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

describe("RLS organization INSERT alignment", () => {
  it.skipIf(!canRun)(
    "denies direct org INSERT, allows RPC bootstrap, blocks membership escalation",
    async () => {
      const admin = createClient<Database>(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const createdUserIds: string[] = [];
      const createdOrgIds: string[] = [];

      try {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        const password = "test-password-123";

        const creator = await createAuthedUser(
          admin,
          `org-creator-${suffix}@example.com`,
          password,
        );
        const outsider = await createAuthedUser(
          admin,
          `org-outsider-${suffix}@example.com`,
          password,
        );
        createdUserIds.push(creator.user.id, outsider.user.id);

        // Negative: authenticated direct INSERT must be denied (RPC-only).
        const { data: directOrg, error: directError } = await creator.client
          .from("organizations")
          .insert({
            name: `Direct ${suffix}`,
            slug: `direct-${suffix}`,
            created_by: creator.user.id,
          })
          .select("id")
          .maybeSingle();

        expect(directOrg).toBeNull();
        expect(directError?.code).toBe("42501");

        // Positive: RPC creates org + owner membership with correct ownership.
        const { data: rpcData, error: rpcError } = await creator.client.rpc(
          "create_organization",
          {
            org_name: `RPC Org ${suffix}`,
            org_slug: `rpc-org-${suffix}`,
          },
        );
        expect(rpcError).toBeNull();
        const organization = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        expect(organization?.id).toBeTruthy();
        expect(organization?.created_by).toBe(creator.user.id);
        createdOrgIds.push(organization!.id);

        const { data: membership, error: membershipError } =
          await creator.client
            .from("organization_members")
            .select("role, user_id")
            .eq("organization_id", organization!.id)
            .eq("user_id", creator.user.id)
            .single();

        expect(membershipError).toBeNull();
        expect(membership?.role).toBe("owner");

        // Negative: outsider cannot forge membership on another tenant.
        const { data: forged, error: forgedError } = await outsider.client
          .from("organization_members")
          .insert({
            organization_id: organization!.id,
            user_id: outsider.user.id,
            role: "owner",
          })
          .select("id")
          .maybeSingle();

        expect(forged).toBeNull();
        expect(forgedError?.code).toBe("42501");

        // Negative: creator cannot self-insert a second escalated membership row
        // for another user via the authenticated client.
        const { data: crossInsert, error: crossError } = await creator.client
          .from("organization_members")
          .insert({
            organization_id: organization!.id,
            user_id: outsider.user.id,
            role: "admin",
          })
          .select("id")
          .maybeSingle();

        expect(crossInsert).toBeNull();
        expect(crossError?.code).toBe("42501");

        // Negative: anonymous/unauthenticated RPC must fail.
        const anon = createClient<Database>(url!, publishableKey!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error: anonError } = await anon.rpc("create_organization", {
          org_name: `Anon ${suffix}`,
          org_slug: `anon-${suffix}`,
        });
        expect(anonError).toBeTruthy();
      } finally {
        for (const orgId of createdOrgIds) {
          await admin.from("organizations").delete().eq("id", orgId);
        }
        for (const userId of createdUserIds) {
          await admin.auth.admin.deleteUser(userId);
        }
      }
    },
  );

  it.skipIf(canRun)(
    "skips when Supabase credentials are unavailable",
    () => {
      expect(canRun).toBe(false);
    },
  );
});
