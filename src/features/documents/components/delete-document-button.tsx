"use client";

import { useActionState } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  deleteDocumentAction,
  type DocumentActionState,
} from "@/features/documents/actions/document";

const initialState: DocumentActionState = {};

type Props = {
  documentId: string;
  organizationId: string;
};

export function DeleteDocumentButton({ documentId, organizationId }: Props) {
  const [state, formAction] = useActionState(deleteDocumentAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      {state.error ? (
        <p className="text-xs text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <FormSubmitButton
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        pendingLabel="Deleting…"
      >
        Delete
      </FormSubmitButton>
    </form>
  );
}
