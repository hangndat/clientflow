import { redirect } from "next/navigation";

import { DeleteDocumentButton } from "@/features/documents/components/delete-document-button";
import { DocumentDownloadButton } from "@/features/documents/components/document-download-button";
import { DocumentUploadForm } from "@/features/documents/components/document-upload-form";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

export default async function DocumentsPage() {
  const { supabase, user } = await requireUser();
  const { activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );
  if (!activeOrganization) redirect("/onboarding");

  const [{ data: documents, error }, { data: projects }, { data: clients }, { data: membership }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, title, visibility, mime_type, size_bytes, created_at, storage_path")
        .eq("organization_id", activeOrganization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", activeOrganization.id)
        .order("name"),
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

  if (error) throw new Error(error.message);

  const canDelete =
    membership?.role === "owner" || membership?.role === "admin";

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Documents
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          Secure file library
        </h1>
        <p className="mt-2 text-slate-600">
          Files are stored in a private bucket under your organization folder.
          Client-visible files can appear on portal links.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Upload</h2>
        <div className="mt-4">
          <DocumentUploadForm
            organizationId={activeOrganization.id}
            projects={projects ?? []}
            clients={clients ?? []}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Library</h2>
        {(documents ?? []).length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No documents uploaded yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {(documents ?? []).map((doc) => (
              <li key={doc.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{doc.title}</p>
                  <p className="text-sm text-slate-600">
                    {doc.visibility} · {doc.mime_type || "file"}
                    {doc.size_bytes ? ` · ${Math.round(doc.size_bytes / 1024)} KB` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DocumentDownloadButton
                    documentId={doc.id}
                    organizationId={activeOrganization.id}
                  />
                  {canDelete ? (
                    <DeleteDocumentButton
                      documentId={doc.id}
                      organizationId={activeOrganization.id}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
