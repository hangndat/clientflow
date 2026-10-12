import type { Json } from "@/types/database";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export async function recordActivity(
  supabase: ServerSupabase,
  input: {
    organizationId: string;
    entityType: string;
    entityId: string;
    action: string;
    summary: string;
    metadata?: Json;
  },
) {
  const { error } = await supabase.rpc("log_activity", {
    target_org_id: input.organizationId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });

  if (error) {
    // Activity must not block primary mutations; surface in logs only.
    console.error("log_activity failed", error.message);
  }
}
