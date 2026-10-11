import { cookies } from "next/headers";

import type { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/types/database";

export const ACTIVE_ORG_COOKIE = "cf_active_org";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export async function listUserOrganizations(
  supabase: ServerSupabase,
  userId: string,
): Promise<Organization[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const organizationIds = (memberships ?? []).map((row) => row.organization_id);
  if (organizationIds.length === 0) {
    return [];
  }

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .in("id", organizationIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return organizations ?? [];
}

export async function resolveActiveOrganization(
  supabase: ServerSupabase,
  userId: string,
): Promise<{
  organizations: Organization[];
  activeOrganization: Organization | null;
}> {
  const organizations = await listUserOrganizations(supabase, userId);
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const activeOrganization =
    organizations.find((org) => org.id === preferredId) ??
    organizations[0] ??
    null;

  return { organizations, activeOrganization };
}

export async function assertOrgMembership(
  supabase: ServerSupabase,
  organizationId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_org_member", {
    target_org_id: organizationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
