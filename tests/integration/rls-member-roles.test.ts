import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

import {
  assertIntegrationAvailable,
  canRunIntegration,
  createAuthedUser,
  getIntegrationEnv,
} from "./_helpers";

const canRun = canRunIntegration();
assertIntegrationAvailable();

describe("RLS membership role hardening", () => {
  it.skipIf(!canRun)(
    "blocks unauthorized owner bootstrap and admin self-promotion",
    async () => {
      const { url, publishableKey, serviceRoleKey } = getIntegrationEnv();
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
          url!,
          publishableKey!,
        );
        const adminUser = await createAuthedUser(
          admin,
          `admin-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        const outsider = await createAuthedUser(
          admin,
          `outsider-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
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

        const { error: memberInsertError } = await admin
          .from("organization_members")
          .insert({
            organization_id: organization!.id,
            user_id: adminUser.user.id,
            role: "admin",
          });
        expect(memberInsertError).toBeNull();

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

});
