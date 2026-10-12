import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
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

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

describe("RLS tenant integrity hardening", () => {
  it.skipIf(!canRun)(
    "blocks cross-tenant log_activity, relation spoofing, and portal metadata leaks",
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
          `integrity-a-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        const userB = await createAuthedUser(
          admin,
          `integrity-b-${suffix}@example.com`,
          password,
          url!,
          publishableKey!,
        );
        createdUserIds.push(userA.user.id, userB.user.id);

        const { data: orgAData } = await userA.client.rpc("create_organization", {
          org_name: `Integrity A ${suffix}`,
          org_slug: `integrity-a-${suffix}`,
        });
        const orgA = Array.isArray(orgAData) ? orgAData[0] : orgAData;

        const { data: orgBData } = await userB.client.rpc("create_organization", {
          org_name: `Integrity B ${suffix}`,
          org_slug: `integrity-b-${suffix}`,
        });
        const orgB = Array.isArray(orgBData) ? orgBData[0] : orgBData;
        expect(orgA?.id && orgB?.id).toBeTruthy();

        // P0: outsider cannot write activity into another tenant via SECURITY DEFINER RPC.
        const { data: leakedActivity, error: activityError } =
          await userB.client.rpc("log_activity", {
            target_org_id: orgA!.id,
            entity_type: "probe",
            entity_id: orgA!.id,
            action: "cross_tenant",
            summary: "should fail",
            metadata: {},
          });
        expect(leakedActivity).toBeNull();
        expect(activityError).toBeTruthy();

        const { data: activityRows } = await userA.client
          .from("activity_events")
          .select("id")
          .eq("organization_id", orgA!.id)
          .eq("summary", "should fail");
        expect(activityRows ?? []).toEqual([]);

        // Owner can log activity in their own org.
        const { error: ownActivityError } = await userA.client.rpc(
          "log_activity",
          {
            target_org_id: orgA!.id,
            entity_type: "probe",
            entity_id: orgA!.id,
            action: "ok",
            summary: "member activity",
            metadata: {},
          },
        );
        expect(ownActivityError).toBeNull();

        const { data: clientA } = await userA.client
          .from("clients")
          .insert({
            organization_id: orgA!.id,
            name: "Client A",
            created_by: userA.user.id,
          })
          .select("id")
          .single();
        const { data: clientB } = await userB.client
          .from("clients")
          .insert({
            organization_id: orgB!.id,
            name: "Client B",
            created_by: userB.user.id,
          })
          .select("id")
          .single();

        // P0: cannot attach foreign-tenant client_id to a project.
        const { data: spoofedProject, error: spoofProjectError } =
          await userA.client
            .from("projects")
            .insert({
              organization_id: orgA!.id,
              client_id: clientB!.id,
              name: "Spoofed project",
              created_by: userA.user.id,
            })
            .select("id")
            .maybeSingle();
        expect(spoofedProject).toBeNull();
        expect(spoofProjectError).toBeTruthy();

        const { data: projectA, error: projectOkError } = await userA.client
          .from("projects")
          .insert({
            organization_id: orgA!.id,
            client_id: clientA!.id,
            name: "Valid project",
            created_by: userA.user.id,
          })
          .select("id")
          .single();
        expect(projectOkError).toBeNull();

        const { data: projectB } = await userB.client
          .from("projects")
          .insert({
            organization_id: orgB!.id,
            client_id: clientB!.id,
            name: "Other project",
            created_by: userB.user.id,
          })
          .select("id")
          .single();

        // P0: documents cannot reference cross-tenant project/client.
        const { data: spoofDocProject, error: spoofDocProjectError } =
          await userA.client
            .from("documents")
            .insert({
              organization_id: orgA!.id,
              project_id: projectB!.id,
              title: "Bad project link",
              storage_path: `${orgA!.id}/${crypto.randomUUID()}/bad-project.txt`,
              uploaded_by: userA.user.id,
              visibility: "internal",
            })
            .select("id")
            .maybeSingle();
        expect(spoofDocProject).toBeNull();
        expect(spoofDocProjectError).toBeTruthy();

        const { data: spoofDocClient, error: spoofDocClientError } =
          await userA.client
            .from("documents")
            .insert({
              organization_id: orgA!.id,
              client_id: clientB!.id,
              title: "Bad client link",
              storage_path: `${orgA!.id}/${crypto.randomUUID()}/bad-client.txt`,
              uploaded_by: userA.user.id,
              visibility: "client",
            })
            .select("id")
            .maybeSingle();
        expect(spoofDocClient).toBeNull();
        expect(spoofDocClientError).toBeTruthy();

        // P0: portal_tokens cannot bind foreign client under another org id.
        const { data: spoofToken, error: spoofTokenError } = await admin
          .from("portal_tokens")
          .insert({
            organization_id: orgA!.id,
            client_id: clientB!.id,
            token_hash: `spoof-${suffix}`,
            created_by: userA.user.id,
          })
          .select("id")
          .maybeSingle();
        expect(spoofToken).toBeNull();
        expect(spoofTokenError).toBeTruthy();

        const rawToken = randomBytes(24).toString("base64url");
        const tokenHash = hashToken(rawToken);
        const { error: tokenOkError } = await admin.from("portal_tokens").insert({
          organization_id: orgA!.id,
          client_id: clientA!.id,
          token_hash: tokenHash,
          created_by: userA.user.id,
        });
        expect(tokenOkError).toBeNull();

        const { data: sharedDoc } = await userA.client
          .from("documents")
          .insert({
            organization_id: orgA!.id,
            client_id: clientA!.id,
            project_id: projectA!.id,
            title: "Shared doc",
            storage_path: `${orgA!.id}/${crypto.randomUUID()}/shared.txt`,
            uploaded_by: userA.user.id,
            visibility: "client",
          })
          .select("id")
          .single();

        await userA.client.from("documents").insert({
          organization_id: orgA!.id,
          client_id: clientA!.id,
          title: "Internal secret",
          storage_path: `${orgA!.id}/${crypto.randomUUID()}/internal.txt`,
          uploaded_by: userA.user.id,
          visibility: "internal",
        });

        const anon = createClient<Database>(url!, publishableKey!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Portal metadata: wrong token discloses nothing.
        const { data: badResolve } = await anon.rpc("resolve_portal_token", {
          token_hash: "definitely-wrong",
        });
        expect(badResolve ?? []).toEqual([]);

        const { data: goodResolve } = await anon.rpc("resolve_portal_token", {
          token_hash: tokenHash,
        });
        const resolved = Array.isArray(goodResolve)
          ? goodResolve[0]
          : goodResolve;
        expect(resolved?.organization_id).toBe(orgA!.id);
        expect(resolved?.client_id).toBe(clientA!.id);
        expect(resolved?.organization_id).not.toBe(orgB!.id);

        const { data: portalProjects } = await anon.rpc("portal_list_projects", {
          token_hash: tokenHash,
        });
        expect((portalProjects ?? []).map((p) => p.id)).toContain(projectA!.id);
        expect((portalProjects ?? []).map((p) => p.id)).not.toContain(
          projectB!.id,
        );

        const { data: portalDocs } = await anon.rpc("portal_list_documents", {
          token_hash: tokenHash,
        });
        const portalDocIds = (portalDocs ?? []).map((d) => d.id);
        expect(portalDocIds).toContain(sharedDoc!.id);
        expect(portalDocIds.length).toBe(1);

        // Internal doc path must not resolve for portal token.
        const { data: internalLookup } = await anon.rpc("portal_get_document", {
          token_hash: tokenHash,
          document_id: (
            await userA.client
              .from("documents")
              .select("id")
              .eq("organization_id", orgA!.id)
              .eq("visibility", "internal")
              .single()
          ).data!.id,
        });
        expect(internalLookup ?? []).toEqual([]);

        const { data: sharedLookup } = await anon.rpc("portal_get_document", {
          token_hash: tokenHash,
          document_id: sharedDoc!.id,
        });
        expect(
          (Array.isArray(sharedLookup) ? sharedLookup[0] : sharedLookup)?.id,
        ).toBe(sharedDoc!.id);
      } finally {
        for (const userId of createdUserIds) {
          await admin.auth.admin.deleteUser(userId);
        }
      }
    },
  );
});
