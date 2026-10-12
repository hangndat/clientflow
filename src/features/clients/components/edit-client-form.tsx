"use client";

import { useActionState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  deleteClientAction,
  updateClientAction,
  type ClientActionState,
} from "@/features/clients/actions/client";
import type { Client } from "@/types/database";

const initialState: ClientActionState = {};

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type EditClientFormProps = {
  client: Client;
  canDelete: boolean;
};

export function EditClientForm({ client, canDelete }: EditClientFormProps) {
  const [updateState, updateAction] = useActionState(
    updateClientAction,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteClientAction,
    initialState,
  );

  return (
    <div className="space-y-8">
      <form action={updateAction} className="space-y-4">
        <input type="hidden" name="clientId" value={client.id} />
        <input type="hidden" name="organizationId" value={client.organization_id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Client name
            <input
              className={fieldClass}
              name="name"
              required
              defaultValue={client.name}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className={fieldClass}
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Company
            <input
              className={fieldClass}
              name="company"
              defaultValue={client.company ?? ""}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Notes
            <textarea
              className={`${fieldClass} min-h-24`}
              name="notes"
              defaultValue={client.notes ?? ""}
            />
          </label>
        </div>

        {updateState.error ? (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {updateState.error}
          </p>
        ) : null}

        {updateState.success ? (
          <p
            className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800"
            role="status"
          >
            {updateState.success}
          </p>
        ) : null}

        <FormSubmitButton
          className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          pendingLabel="Saving…"
        >
          Save changes
        </FormSubmitButton>
      </form>

      {canDelete ? (
        <form
          action={deleteAction}
          className="rounded-lg border border-red-200 bg-red-50/60 p-4"
        >
          <input type="hidden" name="clientId" value={client.id} />
          <input
            type="hidden"
            name="organizationId"
            value={client.organization_id}
          />
          <h3 className="text-sm font-semibold text-red-900">Delete client</h3>
          <p className="mt-1 text-sm text-red-800">
            Permanently remove this client record. Owners and admins only.
          </p>
          {deleteState.error ? (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {deleteState.error}
            </p>
          ) : null}
          <FormSubmitButton
            className="mt-3 inline-flex rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            pendingLabel="Deleting…"
          >
            Delete client
          </FormSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
