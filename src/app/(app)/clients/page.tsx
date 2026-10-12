import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateClientForm } from "@/features/clients/components/create-client-form";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

export default async function ClientsPage() {
  const { supabase, user } = await requireUser();
  const { activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );

  if (!activeOrganization) {
    redirect("/onboarding");
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, email, company, notes, created_at")
    .eq("organization_id", activeOrganization.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Clients
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          {activeOrganization.name}
        </h1>
        <p className="mt-2 text-slate-600">
          Only members of this organization can create or view these records.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add a client</h2>
        <div className="mt-4">
          <CreateClientForm organizationId={activeOrganization.id} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Organization clients
        </h2>

        {(clients ?? []).length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No clients yet. Create the first record for this organization.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {(clients ?? []).map((client) => (
              <li key={client.id} className="py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-slate-900 hover:text-teal-800 hover:underline"
                    >
                      {client.name}
                    </Link>
                    <p className="text-sm text-slate-600">
                      {[client.company, client.email]
                        .filter(Boolean)
                        .join(" · ") || "No company or email"}
                    </p>
                    {client.notes ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {client.notes}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(client.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
