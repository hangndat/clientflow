"use client";

import { useActionState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  createClientAction,
  type ClientActionState,
} from "@/features/clients/actions/client";

const initialState: ClientActionState = {};

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type CreateClientFormProps = {
  organizationId: string;
};

export function CreateClientForm({ organizationId }: CreateClientFormProps) {
  const [state, formAction] = useActionState(createClientAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organizationId" value={organizationId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Client name
          <input className={fieldClass} name="name" required />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input className={fieldClass} name="email" type="email" />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Company
          <input className={fieldClass} name="company" />
        </label>

        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Notes
          <textarea className={`${fieldClass} min-h-24`} name="notes" />
        </label>
      </div>

      {state.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

      <FormSubmitButton
        className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        pendingLabel="Saving client…"
      >
        Add client
      </FormSubmitButton>
    </form>
  );
}
