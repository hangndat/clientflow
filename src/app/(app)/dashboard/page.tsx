import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const { activeOrganization, organizations } = await resolveActiveOrganization(
    supabase,
    user.id,
  );

  if (!activeOrganization) {
    redirect("/onboarding");
  }

  const { count, error } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", activeOrganization.id);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Dashboard
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          {activeOrganization.name}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Authenticated workspace for organization{" "}
          <span className="font-medium text-slate-800">
            {activeOrganization.slug}
          </span>
          . Client records are scoped by membership and PostgreSQL RLS.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active organization</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {activeOrganization.name}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Organizations you belong to</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {organizations.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Clients in this org</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {count ?? 0}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Next step</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create and review client records for the selected organization.
        </p>
        <Link
          href="/clients"
          className="mt-4 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Manage clients
        </Link>
      </section>
    </div>
  );
}
