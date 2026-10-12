"use client";

import { useActionState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  createPortalLinkAction,
  revokePortalLinkAction,
  type PortalActionState,
} from "@/features/portal/actions/portal";
import type { Client, PortalToken } from "@/types/database";

const initialState: PortalActionState = {};
const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Props = {
  organizationId: string;
  clients: Pick<Client, "id" | "name">[];
  tokens: Array<
    Pick<PortalToken, "id" | "label" | "expires_at" | "revoked_at" | "created_at" | "client_id"> & {
      client_name?: string;
    }
  >;
};

export function PortalAdminForms({ organizationId, clients, tokens }: Props) {
  const [createState, createAction] = useActionState(
    createPortalLinkAction,
    initialState,
  );
  const [revokeState, revokeAction] = useActionState(
    revokePortalLinkAction,
    initialState,
  );

  return (
    <div className="space-y-8">
      <form action={createAction} className="space-y-4">
        <input type="hidden" name="organizationId" value={organizationId} />
        <label className="block text-sm font-medium text-slate-700">
          Client
          <select className={fieldClass} name="clientId" required defaultValue="">
            <option value="" disabled>
              Select client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Label
            <input className={fieldClass} name="label" placeholder="Q4 status share" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Expires in days
            <input className={fieldClass} name="expiresInDays" type="number" min={1} max={365} defaultValue={30} />
          </label>
        </div>
        {createState.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {createState.error}
          </p>
        ) : null}
        {createState.success ? (
          <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900" role="status">
            <p>{createState.success}</p>
            {createState.portalUrl ? (
              <p className="mt-2 break-all font-mono text-xs">{createState.portalUrl}</p>
            ) : null}
          </div>
        ) : null}
        <FormSubmitButton
          className="inline-flex rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          pendingLabel="Creating…"
        >
          Create portal link
        </FormSubmitButton>
      </form>

      <div>
        <h3 className="text-lg font-semibold text-slate-900">Existing links</h3>
        {tokens.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No portal links yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {tokens.map((token) => (
              <li key={token.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {token.label || "Portal link"} · {token.client_name || "Client"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {token.revoked_at
                      ? "Revoked"
                      : `Expires ${token.expires_at ? new Date(token.expires_at).toLocaleDateString() : "never"}`}
                  </p>
                </div>
                {!token.revoked_at ? (
                  <form action={revokeAction}>
                    <input type="hidden" name="tokenId" value={token.id} />
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <FormSubmitButton
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      pendingLabel="Revoking…"
                    >
                      Revoke
                    </FormSubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {revokeState.error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {revokeState.error}
          </p>
        ) : null}
        {revokeState.success ? (
          <p className="mt-2 text-sm text-teal-800" role="status">
            {revokeState.success}
          </p>
        ) : null}
      </div>
    </div>
  );
}
