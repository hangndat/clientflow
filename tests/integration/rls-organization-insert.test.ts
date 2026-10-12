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

describe("RLS organization INSERT alignment", () => {
  it.skipIf(!canRun)(
    "denies direct org INSERT, allows RPC bootstrap, blocks membership escalation",
    async () => {
      const { url, publishableKey, serviceRoleKey } = getIntegrationEnv();
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
          url!,
          publishableKey!,
        );
        const outsider = await createAuthedUser(
          admin,
          `org-outsider-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        createdUserIds.push(creator.user.id, outsider.user.id);

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

});
