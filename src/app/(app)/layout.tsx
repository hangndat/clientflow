import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

// Session and membership reads are request-bound; allow blocking render.
export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();
  const { organizations, activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );

  return (
    <AppShell
      email={user.email ?? "signed-in user"}
      organizations={organizations}
      activeOrganization={activeOrganization}
    >
      {children}
    </AppShell>
  );
}
