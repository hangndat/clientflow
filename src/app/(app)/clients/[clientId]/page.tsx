import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditClientForm } from "@/features/clients/components/edit-client-form";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

type ClientDetailPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { clientId } = await params;
  const { supabase, user } = await requireUser();
  const { activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );

  if (!activeOrganization) {
    redirect("/onboarding");
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select(
      "id, organization_id, name, email, company, notes, created_by, created_at, updated_at",
    )
    .eq("id", clientId)
    .eq("organization_id", activeOrganization.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!client) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", activeOrganization.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canDelete =
    membership?.role === "owner" || membership?.role === "admin";

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/clients"
          className="text-sm font-medium text-teal-800 hover:underline"
        >
          ← Back to clients
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Client
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          {client.name}
        </h1>
        <p className="mt-2 text-slate-600">
          Update details for this organization-scoped record.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <EditClientForm client={client} canDelete={canDelete} />
      </section>
    </div>
  );
}
