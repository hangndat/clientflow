"use client";

import { useActionState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
  type ProjectActionState,
} from "@/features/projects/actions/project";
import type { Client, Project, ProjectStatus } from "@/types/database";

const initialState: ProjectActionState = {};
const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const statuses: ProjectStatus[] = [
  "planned",
  "active",
  "blocked",
  "completed",
  "cancelled",
];

type ProjectFormProps = {
  organizationId: string;
  clients: Pick<Client, "id" | "name">[];
  project?: Project;
  canDelete?: boolean;
};

export function ProjectForm({
  organizationId,
  clients,
  project,
  canDelete = false,
}: ProjectFormProps) {
  const action = project ? updateProjectAction : createProjectAction;
  const [state, formAction] = useActionState(action, initialState);
  const [deleteState, deleteAction] = useActionState(
    deleteProjectAction,
    initialState,
  );

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="organizationId" value={organizationId} />
        {project ? (
          <input type="hidden" name="projectId" value={project.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Project name
            <input
              className={fieldClass}
              name="name"
              required
              defaultValue={project?.name}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              className={fieldClass}
              name="status"
              defaultValue={project?.status ?? "planned"}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Client
            <select
              className={fieldClass}
              name="clientId"
              defaultValue={project?.client_id ?? ""}
            >
              <option value="">Unassigned</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <textarea
              className={`${fieldClass} min-h-24`}
              name="description"
              defaultValue={project?.description ?? ""}
            />
          </label>
        </div>

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
          pendingLabel="Saving…"
        >
          {project ? "Save project" : "Create project"}
        </FormSubmitButton>
      </form>

      {project && canDelete ? (
        <form action={deleteAction} className="rounded-lg border border-red-200 bg-red-50/60 p-4">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="organizationId" value={organizationId} />
          <h3 className="text-sm font-semibold text-red-900">Delete project</h3>
          <p className="mt-1 text-sm text-red-800">Owners and admins only.</p>
          {deleteState.error ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {deleteState.error}
            </p>
          ) : null}
          <FormSubmitButton
            className="mt-3 inline-flex rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            pendingLabel="Deleting…"
          >
            Delete project
          </FormSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
