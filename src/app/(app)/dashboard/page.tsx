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

  const [
    { count: clientCount, error: clientError },
    { count: projectCount, error: projectError },
    { count: documentCount, error: documentError },
    { data: recentActivity, error: activityError },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", activeOrganization.id),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", activeOrganization.id),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", activeOrganization.id),
    supabase
      .from("activity_events")
      .select("id, summary, created_at")
      .eq("organization_id", activeOrganization.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (clientError || projectError || documentError || activityError) {
    throw new Error(
      clientError?.message ||
        projectError?.message ||
        documentError?.message ||
        activityError?.message ||
        "Dashboard query failed",
    );
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
          Authenticated workspace for{" "}
          <span className="font-medium text-slate-800">
            {activeOrganization.slug}
          </span>
          . Tenant data is scoped by membership and PostgreSQL RLS.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Organizations", value: organizations.length },
          { label: "Clients", value: clientCount ?? 0 },
          { label: "Projects", value: projectCount ?? 0 },
          { label: "Documents", value: documentCount ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          {(recentActivity ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No events yet. Create a client or project to start the timeline.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-200">
              {(recentActivity ?? []).map((event) => (
                <li key={event.id} className="py-3">
                  <p className="text-sm font-medium text-slate-900">
                    {event.summary}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/activity"
            className="mt-4 inline-flex text-sm font-semibold text-teal-800 hover:underline"
          >
            View full timeline
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick links</h2>
          <div className="mt-4 flex flex-col gap-2">
            {[
              ["/clients", "Manage clients"],
              ["/projects", "Manage projects"],
              ["/documents", "Upload documents"],
              ["/portal", "Client portal links"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
