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

describe("document storage lifecycle", () => {
  it.skipIf(!canRun)(
    "uploads, signs download URL for staff, and removes storage on delete",
    async () => {
      const { url, publishableKey, serviceRoleKey } = getIntegrationEnv();
      const admin = createClient<Database>(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const createdUserIds: string[] = [];

      try {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        const owner = await createAuthedUser(
          admin,
          `docs-${suffix}@example.com`,
          "test-password-123",
          url!,
          publishableKey!,
        );
        createdUserIds.push(owner.user.id);

        const { data: orgData } = await owner.client.rpc("create_organization", {
          org_name: `Docs ${suffix}`,
          org_slug: `docs-${suffix}`,
        });
        const org = Array.isArray(orgData) ? orgData[0] : orgData;
        expect(org?.id).toBeTruthy();

        const documentId = crypto.randomUUID();
        const storagePath = `${org!.id}/${documentId}/lifecycle.txt`;
        const payload = new TextEncoder().encode(`hello-${suffix}`);

        const { error: uploadError } = await owner.client.storage
          .from("org-documents")
          .upload(storagePath, payload, {
            contentType: "text/plain",
            upsert: false,
          });
        expect(uploadError).toBeNull();

        const { data: doc, error: insertError } = await owner.client
          .from("documents")
          .insert({
            id: documentId,
            organization_id: org!.id,
            title: "Lifecycle",
            storage_path: storagePath,
            mime_type: "text/plain",
            size_bytes: payload.byteLength,
            visibility: "internal",
            uploaded_by: owner.user.id,
          })
          .select("id, storage_path")
          .single();
        expect(insertError).toBeNull();

        const { data: signed, error: signedError } = await owner.client.storage
          .from("org-documents")
          .createSignedUrl(doc!.storage_path, 60);
        expect(signedError).toBeNull();
        expect(signed?.signedUrl).toBeTruthy();

        const download = await fetch(signed!.signedUrl);
        expect(download.ok).toBe(true);
        expect(await download.text()).toContain(`hello-${suffix}`);

        // Outsider cannot sign the object.
        const outsider = await createAuthedUser(
          admin,
          `docs-out-${suffix}@example.com`,
          "test-password-123",
          url!,
          publishableKey!,
        );
        createdUserIds.push(outsider.user.id);
        await outsider.client.rpc("create_organization", {
          org_name: `Docs Out ${suffix}`,
          org_slug: `docs-out-${suffix}`,
        });

        const { data: leakedSign, error: leakError } =
          await outsider.client.storage
            .from("org-documents")
            .createSignedUrl(storagePath, 60);
        expect(leakedSign?.signedUrl).toBeFalsy();
        expect(leakError).toBeTruthy();

        const { error: storageDeleteError } = await owner.client.storage
          .from("org-documents")
          .remove([storagePath]);
        expect(storageDeleteError).toBeNull();

        const { error: rowDeleteError } = await owner.client
          .from("documents")
          .delete()
          .eq("id", documentId)
          .eq("organization_id", org!.id);
        expect(rowDeleteError).toBeNull();

        const { data: after } = await admin.storage
          .from("org-documents")
          .list(`${org!.id}/${documentId}`);
        expect((after ?? []).length).toBe(0);
      } finally {
        for (const userId of createdUserIds) {
          await admin.auth.admin.deleteUser(userId);
        }
      }
    },
  );
});
