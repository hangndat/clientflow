import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProjectForm } from "@/features/projects/components/project-form";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  const { supabase, user } = await requireUser();
  const { activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );
  if (!activeOrganization) redirect("/onboarding");

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("organization_id", activeOrganization.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!project) notFound();

  const [{ data: clients }, { data: membership }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("organization_id", activeOrganization.id)
      .order("name"),
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", activeOrganization.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const canDelete =
    membership?.role === "owner" || membership?.role === "admin";

  return (
    <div className="space-y-8">
      <section>
        <Link href="/projects" className="text-sm font-medium text-teal-800 hover:underline">
          ← Back to projects
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          {project.name}
        </h1>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <ProjectForm
          organizationId={activeOrganization.id}
          clients={clients ?? []}
          project={project}
          canDelete={canDelete}
        />
      </section>
    </div>
  );
}
