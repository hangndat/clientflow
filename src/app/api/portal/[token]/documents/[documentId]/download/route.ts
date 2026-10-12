import { NextResponse } from "next/server";

import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/env";
import { hashPortalToken } from "@/lib/portal-token";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type RouteContext = {
  params: Promise<{ token: string; documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token, documentId } = await context.params;

  if (!token || token.length < 20 || !documentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Portal downloads are not configured on this deployment" },
      { status: 503 },
    );
  }

  const tokenHash = hashPortalToken(token);
  const anon = createClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: rows, error } = await anon.rpc("portal_get_document", {
    token_hash: tokenHash,
    document_id: documentId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const doc = Array.isArray(rows) ? rows[0] : rows;
  if (!doc?.storage_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error: signedError } = await admin.storage
    .from("org-documents")
    .createSignedUrl(doc.storage_path, 60);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message ?? "Could not create download URL" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
