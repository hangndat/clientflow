import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import { hashPortalToken } from "@/lib/portal-token";
import type { Database } from "@/types/database";

// Token lookup is request-bound; allow blocking render.
export const instant = false;

type Props = { params: Promise<{ token: string }> };

export default async function ExternalPortalPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 20) notFound();

  const tokenHash = hashPortalToken(token);
  const supabase = createClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: resolved, error } = await supabase.rpc("resolve_portal_token", {
    token_hash: tokenHash,
  });

  if (error) {
    throw new Error(error.message);
  }

  const portal = Array.isArray(resolved) ? resolved[0] : resolved;
  if (!portal) notFound();

  const [{ data: projects }, { data: documents }] = await Promise.all([
    supabase.rpc("portal_list_projects", { token_hash: tokenHash }),
    supabase.rpc("portal_list_documents", { token_hash: tokenHash }),
  ]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5,_transparent_45%),linear-gradient(180deg,#f8fafc,#eef2ff)] text-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Client portal
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-4xl font-semibold">
          {portal.organization_name}
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Shared workspace for <span className="font-medium text-slate-800">{portal.client_name}</span>
        </p>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Projects</h2>
          {(projects ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No projects shared yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(projects ?? []).map((project) => (
                <li key={project.id} className="rounded-lg border border-slate-200 px-4 py-3">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-slate-600">{project.status}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Shared documents</h2>
          {(documents ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No client-visible documents.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(documents ?? []).map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-slate-600">
                      {doc.mime_type || "file"}
                    </p>
                  </div>
                  <a
                    href={`/api/portal/${encodeURIComponent(token)}/documents/${doc.id}/download`}
                    className="inline-flex rounded-md border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-900 hover:bg-teal-100"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
