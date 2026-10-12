"use client";

import { useState, useTransition } from "react";

import { createStaffDocumentDownloadUrlAction } from "@/features/documents/actions/document";

type Props = {
  documentId: string;
  organizationId: string;
};

export function DocumentDownloadButton({
  documentId,
  organizationId,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createStaffDocumentDownloadUrlAction(
              documentId,
              organizationId,
            );
            if (result.error || !result.downloadUrl) {
              setError(result.error ?? "Download failed");
              return;
            }
            window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
          });
        }}
      >
        {pending ? "Preparing…" : "Download"}
      </button>
      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
