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

describe("RLS tenant isolation", () => {
  it.skipIf(!canRun)(
    "prevents cross-tenant client reads and writes",
    async () => {
      const { url, publishableKey, serviceRoleKey } = getIntegrationEnv();
      const admin = createClient<Database>(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const createdUserIds: string[] = [];

      try {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        const password = "test-password-123";

        const userA = await createAuthedUser(
          admin,
          `tenant-a-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        const userB = await createAuthedUser(
          admin,
          `tenant-b-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        createdUserIds.push(userA.user.id, userB.user.id);

        const { data: orgA, error: orgAError } = await userA.client.rpc(
          "create_organization",
          {
            org_name: `Tenant A ${suffix}`,
            org_slug: `tenant-a-${suffix}`,
          },
        );
        expect(orgAError).toBeNull();
        const organizationA = Array.isArray(orgA) ? orgA[0] : orgA;
        expect(organizationA?.id).toBeTruthy();

        const { data: orgB, error: orgBError } = await userB.client.rpc(
          "create_organization",
          {
            org_name: `Tenant B ${suffix}`,
            org_slug: `tenant-b-${suffix}`,
          },
        );
        expect(orgBError).toBeNull();
        const organizationB = Array.isArray(orgB) ? orgB[0] : orgB;
        expect(organizationB?.id).toBeTruthy();

        const { data: clientA, error: createClientError } = await userA.client
          .from("clients")
          .insert({
            organization_id: organizationA!.id,
            name: "Protected Client",
            email: "protected@example.com",
            created_by: userA.user.id,
          })
          .select("id, organization_id")
          .single();

        expect(createClientError).toBeNull();
        expect(clientA?.organization_id).toBe(organizationA!.id);

        const { data: leakedClients, error: leakError } = await userB.client
          .from("clients")
          .select("id")
          .eq("organization_id", organizationA!.id);

        expect(leakError).toBeNull();
        expect(leakedClients ?? []).toEqual([]);

        const { data: forgedInsert, error: forgedError } = await userB.client
          .from("clients")
          .insert({
            organization_id: organizationA!.id,
            name: "Forged Client",
            created_by: userB.user.id,
          })
          .select("id")
          .maybeSingle();

        expect(forgedInsert).toBeNull();
        expect(forgedError).toBeTruthy();

        const { data: foreignOrg, error: foreignOrgError } = await userB.client
          .from("organizations")
          .select("id")
          .eq("id", organizationA!.id)
          .maybeSingle();

        expect(foreignOrgError).toBeNull();
        expect(foreignOrg).toBeNull();

        const { data: ownClients, error: ownError } = await userA.client
          .from("clients")
          .select("id")
          .eq("organization_id", organizationA!.id);

        expect(ownError).toBeNull();
        expect((ownClients ?? []).map((row) => row.id)).toContain(clientA!.id);

        const { count: orgBClientCount, error: orgBCountError } =
          await userB.client
            .from("clients")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationB!.id);

        expect(orgBCountError).toBeNull();
        expect(orgBClientCount).toBe(0);
      } finally {
        for (const userId of createdUserIds) {
          await admin.auth.admin.deleteUser(userId);
        }
      }
    },
  );

});
