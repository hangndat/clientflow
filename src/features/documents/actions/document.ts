"use server";

import { revalidatePath } from "next/cache";

import { recordActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { assertOrgMembership } from "@/lib/organization";
import {
  createDocumentMetaSchema,
  deleteDocumentSchema,
} from "@/lib/validations/document";

export type DocumentActionState = {
  error?: string;
  success?: string;
  downloadUrl?: string;
};

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function uploadDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = createDocumentMetaSchema.safeParse({
    organizationId: formData.get("organizationId"),
    projectId: formData.get("projectId") || "",
    clientId: formData.get("clientId") || "",
    title: formData.get("title"),
    visibility: formData.get("visibility") || "internal",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "File must be 10MB or smaller" };
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { error: "Unsupported file type" };
  }

  const { supabase, user } = await requireUser();
  if (!(await assertOrgMembership(supabase, parsed.data.organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const documentId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const storagePath = `${parsed.data.organizationId}/${documentId}/${safeName}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("org-documents")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    organization_id: parsed.data.organizationId,
    project_id: parsed.data.projectId || null,
    client_id: parsed.data.clientId || null,
    title: parsed.data.title,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    visibility: parsed.data.visibility,
    uploaded_by: user.id,
  });

  if (insertError) {
    const { error: cleanupError } = await supabase.storage
      .from("org-documents")
      .remove([storagePath]);
    if (cleanupError) {
      return {
        error: `${insertError.message} (also failed to clean up upload: ${cleanupError.message})`,
      };
    }
    return { error: insertError.message };
  }

  await recordActivity(supabase, {
    organizationId: parsed.data.organizationId,
    entityType: "document",
    entityId: documentId,
    action: "uploaded",
    summary: `Uploaded document “${parsed.data.title}”`,
  });

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  return { success: "Document uploaded" };
}

export async function deleteDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const parsed = deleteDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  if (!(await assertOrgMembership(supabase, parsed.data.organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const { data: doc, error: loadError } = await supabase
    .from("documents")
    .select("id, title, storage_path")
    .eq("id", parsed.data.documentId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (loadError) return { error: loadError.message };
  if (!doc) return { error: "Document not found" };

  // Remove storage object first so a failed delete does not leave a DB row
  // pointing at a missing file. Orphan storage is preferable to broken metadata.
  const { error: storageError } = await supabase.storage
    .from("org-documents")
    .remove([doc.storage_path]);

  if (storageError) {
    return {
      error: `Failed to delete storage object: ${storageError.message}`,
    };
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", doc.id)
    .eq("organization_id", parsed.data.organizationId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return {
      error: `Storage removed but database delete failed: ${deleteError.message}`,
    };
  }
  if (!deleted) {
    return {
      error:
        "Storage removed but document row was not deleted (missing permissions or already gone)",
    };
  }

  await recordActivity(supabase, {
    organizationId: parsed.data.organizationId,
    entityType: "document",
    entityId: doc.id,
    action: "deleted",
    summary: `Deleted document “${doc.title}”`,
  });

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  return { success: "Document deleted" };
}

export async function createStaffDocumentDownloadUrlAction(
  documentId: string,
  organizationId: string,
): Promise<DocumentActionState> {
  if (!documentId || !organizationId) {
    return { error: "Missing document or organization" };
  }

  const { supabase } = await requireUser();
  if (!(await assertOrgMembership(supabase, organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!doc) return { error: "Document not found" };

  const { data: signed, error: signedError } = await supabase.storage
    .from("org-documents")
    .createSignedUrl(doc.storage_path, 60);

  if (signedError || !signed?.signedUrl) {
    return { error: signedError?.message ?? "Could not create download URL" };
  }

  return { success: "Download ready", downloadUrl: signed.signedUrl };
}
