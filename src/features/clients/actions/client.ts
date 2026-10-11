"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { assertOrgMembership } from "@/lib/organization";
import { createClientSchema } from "@/lib/validations/client";

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

  const { error } = await supabase.from("clients").insert({
    organization_id: parsed.data.organizationId,
    name: parsed.data.name,
    email: parsed.data.email || null,
    company: parsed.data.company || null,
    notes: parsed.data.notes || null,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: "Client created" };
}
