"use client";

import { useActionState, useMemo, useState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  createOrganizationAction,
  type OrganizationActionState,
} from "@/features/organizations/actions/organization";
import { slugifyOrganizationName } from "@/lib/validations/organization";

const initialState: OrganizationActionState = {};

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function CreateOrganizationForm() {
  const [state, formAction] = useActionState(
    createOrganizationAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");

  const suggestedSlug = useMemo(() => slugifyOrganizationName(name), [name]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Organization name
        <input
          className={fieldClass}
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) {
              setSlug(slugifyOrganizationName(event.target.value));
            }
          }}
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        URL slug
        <input
          className={fieldClass}
          name="slug"
          value={slug || suggestedSlug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value.toLowerCase());
          }}
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          required
        />
        <span className="mt-1 block text-xs text-slate-500">
          Used only for uniqueness; tenant access is enforced by membership, not
          by guessing this slug.
        </span>
      </label>

      {state.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <FormSubmitButton
        className="inline-flex w-full items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        pendingLabel="Creating organization…"
      >
        Create organization
      </FormSubmitButton>
    </form>
  );
}
