"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { assertOrgMembership } from "@/lib/organization";
import {
  createProjectSchema,
  deleteProjectSchema,
  updateProjectSchema,
} from "@/lib/validations/project";

export type ProjectActionState = {
  error?: string;
  success?: string;
};

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = createProjectSchema.safeParse({
    organizationId: formData.get("organizationId"),
    clientId: formData.get("clientId") || "",
    name: formData.get("name"),
    status: formData.get("status") || "planned",
    description: formData.get("description") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  if (!(await assertOrgMembership(supabase, parsed.data.organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: parsed.data.organizationId,
      client_id: parsed.data.clientId || null,
      name: parsed.data.name,
      status: parsed.data.status,
      description: parsed.data.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create project" };
  }

  await recordActivity(supabase, {
    organizationId: parsed.data.organizationId,
    entityType: "project",
    entityId: data.id,
    action: "created",
    summary: `Created project “${parsed.data.name}”`,
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    organizationId: formData.get("organizationId"),
    clientId: formData.get("clientId") || "",
    name: formData.get("name"),
    status: formData.get("status") || "planned",
    description: formData.get("description") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  if (!(await assertOrgMembership(supabase, parsed.data.organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      client_id: parsed.data.clientId || null,
      name: parsed.data.name,
      status: parsed.data.status,
      description: parsed.data.description || null,
    })
    .eq("id", parsed.data.projectId)
    .eq("organization_id", parsed.data.organizationId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Project not found or not accessible" };

  await recordActivity(supabase, {
    organizationId: parsed.data.organizationId,
    entityType: "project",
    entityId: parsed.data.projectId,
    action: "updated",
    summary: `Updated project “${parsed.data.name}”`,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/dashboard");
  return { success: "Project updated" };
}

export async function deleteProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = deleteProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    organizationId: formData.get("organizationId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  if (!(await assertOrgMembership(supabase, parsed.data.organizationId))) {
    return { error: "You do not have access to this organization" };
  }

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data.projectId)
    .eq("organization_id", parsed.data.organizationId)
    .select("id, name")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) {
    return {
      error: "Project could not be deleted (missing permissions or not found)",
    };
  }

  await recordActivity(supabase, {
    organizationId: parsed.data.organizationId,
    entityType: "project",
    entityId: parsed.data.projectId,
    action: "deleted",
    summary: `Deleted project “${data.name}”`,
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
}
