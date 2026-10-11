"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { ACTIVE_ORG_COOKIE } from "@/lib/organization";
import { createOrganizationSchema } from "@/lib/validations/organization";

export type OrganizationActionState = {
  error?: string;
  success?: string;
};

export async function createOrganizationAction(
  _prev: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
    org_slug: parsed.data.slug,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { error: "That organization slug is already taken" };
    }
    return { error: error.message };
  }

  const organization = Array.isArray(data) ? data[0] : data;
  if (!organization?.id) {
    return { error: "Organization was created but could not be loaded" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organization.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function selectOrganizationAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  if (!organizationId) {
    redirect("/onboarding");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("is_org_member", {
    target_org_id: organizationId,
  });

  if (error || !data) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
