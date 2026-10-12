import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

export default async function ActivityPage() {
  const { supabase, user } = await requireUser();
  const { activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );
  if (!activeOrganization) redirect("/onboarding");

  const { data: events, error } = await supabase
    .from("activity_events")
    .select("id, summary, action, entity_type, created_at, actor_id")
    .eq("organization_id", activeOrganization.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Activity
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          Organization timeline
        </h1>
        <p className="mt-2 text-slate-600">
          Recent create/update/delete events for clients, projects, documents, and portal links.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        {(events ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No activity yet. Create a project or upload a document to populate the timeline.
          </p>
        ) : (
          <ol className="relative space-y-0 border-l border-slate-200 pl-6">
            {(events ?? []).map((event) => (
              <li key={event.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[1.55rem] mt-1.5 h-2.5 w-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
                <p className="font-medium text-slate-900">{event.summary}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {event.entity_type} · {event.action} ·{" "}
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
