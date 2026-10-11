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

describe("RLS membership role hardening", () => {
  it.skipIf(!canRun)(
    "blocks unauthorized owner bootstrap and admin self-promotion",
    async () => {
      const admin = createClient<Database>(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const createdUserIds: string[] = [];

      try {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        const password = "test-password-123";

        const owner = await createAuthedUser(
          admin,
          `owner-${suffix}@example.com`,
          password,
        );
        const adminUser = await createAuthedUser(
          admin,
          `admin-${suffix}@example.com`,
          password,
        );
        const outsider = await createAuthedUser(
          admin,
          `outsider-${suffix}@example.com`,
          password,
        );
        createdUserIds.push(owner.user.id, adminUser.user.id, outsider.user.id);

        const { data: orgData, error: orgError } = await owner.client.rpc(
          "create_organization",
          {
            org_name: `Role Harden ${suffix}`,
            org_slug: `role-harden-${suffix}`,
          },
        );
        expect(orgError).toBeNull();
        const organization = Array.isArray(orgData) ? orgData[0] : orgData;
        expect(organization?.id).toBeTruthy();

        // Owner invites admin via service role (no invite UI in Day 02).
        const { error: memberInsertError } = await admin
          .from("organization_members")
          .insert({
            organization_id: organization!.id,
            user_id: adminUser.user.id,
            role: "admin",
          });
        expect(memberInsertError).toBeNull();

        // Outsider cannot forge owner membership on another org.
        const { data: forgedOwner, error: forgedOwnerError } =
          await outsider.client
            .from("organization_members")
            .insert({
              organization_id: organization!.id,
              user_id: outsider.user.id,
              role: "owner",
            })
            .select("id")
            .maybeSingle();
        expect(forgedOwner).toBeNull();
        expect(forgedOwnerError).toBeTruthy();

        // Admin cannot promote themselves to owner.
        const { data: adminMembership } = await adminUser.client
          .from("organization_members")
          .select("id, role")
          .eq("organization_id", organization!.id)
          .eq("user_id", adminUser.user.id)
          .single();
        expect(adminMembership?.role).toBe("admin");

        const { data: promoted, error: promoteError } = await adminUser.client
          .from("organization_members")
          .update({ role: "owner" })
          .eq("id", adminMembership!.id)
          .select("role")
          .maybeSingle();

        expect(promoted).toBeNull();
        expect(promoteError).toBeTruthy();

        const { data: stillAdmin } = await adminUser.client
          .from("organization_members")
          .select("role")
          .eq("id", adminMembership!.id)
          .single();
        expect(stillAdmin?.role).toBe("admin");

        // Owner can still assign admin/member roles.
        const { error: ownerUpdateError } = await owner.client
          .from("organization_members")
          .update({ role: "member" })
          .eq("id", adminMembership!.id);
        expect(ownerUpdateError).toBeNull();
      } finally {
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
