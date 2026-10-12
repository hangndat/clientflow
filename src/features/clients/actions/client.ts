"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { assertOrgMembership } from "@/lib/organization";
import {
  createClientSchema,
  deleteClientSchema,
  updateClientSchema,
} from "@/lib/validations/client";

export type ClientActionState = {
  error?: string;
  success?: string;
};

export async function createClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const parsed = createClientSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    email: formData.get("email") || "",
    company: formData.get("company") || "",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const isMember = await assertOrgMembership(
    supabase,
    parsed.data.organizationId,
  );

  if (!isMember) {
    return { error: "You do not have access to this organization" };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      company: parsed.data.company || null,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  if (data?.id) {
    redirect(`/clients/${data.id}`);
  }
  return { success: "Client created" };
}

export async function updateClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const parsed = updateClientSchema.safeParse({
    clientId: formData.get("clientId"),
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    email: formData.get("email") || "",
    company: formData.get("company") || "",
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  const isMember = await assertOrgMembership(
    supabase,
    parsed.data.organizationId,
  );

  if (!isMember) {
    return { error: "You do not have access to this organization" };
  }

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      company: parsed.data.company || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", parsed.data.clientId)
    .eq("organization_id", parsed.data.organizationId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { error: "Client not found or not accessible" };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath("/dashboard");
  return { success: "Client updated" };
}

export async function deleteClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const parsed = deleteClientSchema.safeParse({
    clientId: formData.get("clientId"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  const isMember = await assertOrgMembership(
    supabase,
    parsed.data.organizationId,
  );

  if (!isMember) {
    return { error: "You do not have access to this organization" };
  }

  // RLS restricts deletes to owner/admin; members receive an empty update set.
  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", parsed.data.clientId)
    .eq("organization_id", parsed.data.organizationId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return {
      error: "Client could not be deleted (missing permissions or not found)",
    };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect("/clients");
}
