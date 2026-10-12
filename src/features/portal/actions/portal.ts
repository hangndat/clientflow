"use server";

import { revalidatePath } from "next/cache";

import { recordActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";
import { assertOrgMembership } from "@/lib/organization";
import { generatePortalToken } from "@/lib/portal-token";
import {
  createPortalTokenSchema,
  revokePortalTokenSchema,
} from "@/lib/validations/portal";

export type PortalActionState = {
  error?: string;
  success?: string;
  portalUrl?: string;
};

export async function createPortalLinkAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const parsed = createPortalTokenSchema.safeParse({
    organizationId: formData.get("organizationId"),
    clientId: formData.get("clientId"),
    label: formData.get("label") || "",
    expiresInDays: formData.get("expiresInDays") || 30,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  if (!(await assertOrgMembership(supabase, parsed.data.organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { error: "Only owners and admins can create portal links" };
  }

  const { rawToken, tokenHash } = generatePortalToken();
  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("portal_tokens")
    .insert({
      organization_id: parsed.data.organizationId,
      client_id: parsed.data.clientId,
      token_hash: tokenHash,
      label: parsed.data.label || null,
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create portal link" };
  }

  await recordActivity(supabase, {
    organizationId: parsed.data.organizationId,
    entityType: "portal_token",
    entityId: data.id,
    action: "created",
    summary: "Created external client portal link",
  });

  const portalUrl = `${getAppOrigin()}/portal/${rawToken}`;
  revalidatePath("/portal");
  return {
    success: "Portal link created. Copy it now — the raw token is shown once.",
    portalUrl,
  };
}

export async function revokePortalLinkAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const parsed = revokePortalTokenSchema.safeParse({
    tokenId: formData.get("tokenId"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  if (!(await assertOrgMembership(supabase, parsed.data.organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { error: "Only owners and admins can revoke portal links" };
  }

  const { data, error } = await supabase
    .from("portal_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.tokenId)
    .eq("organization_id", parsed.data.organizationId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Portal link not found" };

  await recordActivity(supabase, {
    organizationId: parsed.data.organizationId,
    entityType: "portal_token",
    entityId: parsed.data.tokenId,
    action: "revoked",
    summary: "Revoked external client portal link",
  });

  revalidatePath("/portal");
  return { success: "Portal link revoked" };
}
