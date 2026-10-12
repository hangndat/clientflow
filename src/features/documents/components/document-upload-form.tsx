"use client";

import { useActionState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  uploadDocumentAction,
  type DocumentActionState,
} from "@/features/documents/actions/document";
import type { Client, Project } from "@/types/database";

const initialState: DocumentActionState = {};
const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Props = {
  organizationId: string;
  projects: Pick<Project, "id" | "name">[];
  clients: Pick<Client, "id" | "name">[];
};

export function DocumentUploadForm({
  organizationId,
  projects,
  clients,
}: Props) {
  const [state, formAction] = useActionState(uploadDocumentAction, initialState);

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      <input type="hidden" name="organizationId" value={organizationId} />

      <label className="block text-sm font-medium text-slate-700">
        Title
        <input className={fieldClass} name="title" required />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          Visibility
          <select className={fieldClass} name="visibility" defaultValue="internal">
            <option value="internal">Internal only</option>
            <option value="client">Shared with client portal</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Project
          <select className={fieldClass} name="projectId" defaultValue="">
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select className={fieldClass} name="clientId" defaultValue="">
            <option value="">None</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        File
        <input className={fieldClass} name="file" type="file" required />
      </label>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800" role="status">
          {state.success}
        </p>
      ) : null}

      <FormSubmitButton
        className="inline-flex rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        pendingLabel="Uploading…"
      >
        Upload document
      </FormSubmitButton>
    </form>
  );
}
