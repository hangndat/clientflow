import Link from "next/link";
import { redirect } from "next/navigation";

import { ProjectForm } from "@/features/projects/components/project-form";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

export default async function ProjectsPage() {
  const { supabase, user } = await requireUser();
  const { activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );
  if (!activeOrganization) redirect("/onboarding");

  const [{ data: projects, error }, { data: clients }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, client_id, updated_at")
      .eq("organization_id", activeOrganization.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name")
      .eq("organization_id", activeOrganization.id)
      .order("name"),
  ]);

  if (error) throw new Error(error.message);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Projects
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          Delivery workspace
        </h1>
        <p className="mt-2 text-slate-600">
          Track work per organization, optionally linked to a client.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">New project</h2>
        <div className="mt-4">
          <ProjectForm
            organizationId={activeOrganization.id}
            clients={clients ?? []}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All projects</h2>
        {(projects ?? []).length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No projects yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {(projects ?? []).map((project) => (
              <li key={project.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
                <div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-slate-900 hover:text-teal-800 hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {project.status}
                    {project.client_id
                      ? ` · ${clientName.get(project.client_id) ?? "Client"}`
                      : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(project.updated_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
