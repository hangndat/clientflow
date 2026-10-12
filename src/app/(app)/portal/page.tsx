import { redirect } from "next/navigation";

import { PortalAdminForms } from "@/features/portal/components/portal-admin-forms";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

export default async function PortalAdminPage() {
  const { supabase, user } = await requireUser();
  const { activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );
  if (!activeOrganization) redirect("/onboarding");

  const [{ data: clients }, { data: tokens }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("organization_id", activeOrganization.id)
      .order("name"),
    supabase
      .from("portal_tokens")
      .select("id, label, expires_at, revoked_at, created_at, client_id")
      .eq("organization_id", activeOrganization.id)
      .order("created_at", { ascending: false }),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Client portal
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          External access links
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Issue time-limited links for a client. Raw tokens are hashed at rest;
          only client-visible documents and that client&apos;s projects are exposed.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <PortalAdminForms
          organizationId={activeOrganization.id}
          clients={clients ?? []}
          tokens={(tokens ?? []).map((token) => ({
            ...token,
            client_name: clientName.get(token.client_id),
          }))}
        />
      </section>
    </div>
  );
}
