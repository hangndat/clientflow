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

describe("RLS projects and documents", () => {
  it.skipIf(!canRun)(
    "isolates projects/documents and allows portal RPC for hashed tokens only",
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
          `proj-a-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        const userB = await createAuthedUser(
          admin,
          `proj-b-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        createdUserIds.push(userA.user.id, userB.user.id);

        const { data: orgAData } = await userA.client.rpc("create_organization", {
          org_name: `Proj A ${suffix}`,
          org_slug: `proj-a-${suffix}`,
        });
        const orgA = Array.isArray(orgAData) ? orgAData[0] : orgAData;

        const { data: orgBData } = await userB.client.rpc("create_organization", {
          org_name: `Proj B ${suffix}`,
          org_slug: `proj-b-${suffix}`,
        });
        const orgB = Array.isArray(orgBData) ? orgBData[0] : orgBData;
        expect(orgA?.id && orgB?.id).toBeTruthy();

        const { data: clientA } = await userA.client
          .from("clients")
          .insert({
            organization_id: orgA!.id,
            name: "Portal Client",
            created_by: userA.user.id,
          })
          .select("id")
          .single();

        const { data: projectA, error: projectError } = await userA.client
          .from("projects")
          .insert({
            organization_id: orgA!.id,
            client_id: clientA!.id,
            name: "Secret Project",
            created_by: userA.user.id,
          })
          .select("id")
          .single();
        expect(projectError).toBeNull();

        const { data: leakedProjects } = await userB.client
          .from("projects")
          .select("id")
          .eq("organization_id", orgA!.id);
        expect(leakedProjects ?? []).toEqual([]);

        const { data: forgedProject, error: forgedError } = await userB.client
          .from("projects")
          .insert({
            organization_id: orgA!.id,
            name: "Forged",
            created_by: userB.user.id,
          })
          .select("id")
          .maybeSingle();
        expect(forgedProject).toBeNull();
        expect(forgedError).toBeTruthy();

        const tokenHash = `hash-${suffix}`;
        const { error: tokenError } = await admin.from("portal_tokens").insert({
          organization_id: orgA!.id,
          client_id: clientA!.id,
          token_hash: tokenHash,
          created_by: userA.user.id,
        });
        expect(tokenError).toBeNull();

        const anon = createClient<Database>(url!, publishableKey!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: portalProjects } = await anon.rpc("portal_list_projects", {
          token_hash: tokenHash,
        });
        expect((portalProjects ?? []).map((p) => p.id)).toContain(projectA!.id);

        const { data: badPortal } = await anon.rpc("portal_list_projects", {
          token_hash: "wrong-hash",
        });
        expect(badPortal ?? []).toEqual([]);
      } finally {
        for (const userId of createdUserIds) {
          await admin.auth.admin.deleteUser(userId);
        }
      }
    },
  );
});
