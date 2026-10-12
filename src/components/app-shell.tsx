import Link from "next/link";

import { signOutAction } from "@/features/auth/actions/auth";
import { OrgSwitcher } from "@/features/organizations/components/org-switcher";
import type { Organization } from "@/types/database";

type AppShellProps = {
  children: React.ReactNode;
  email: string;
  organizations: Organization[];
  activeOrganization: Organization | null;
};

export function AppShell({
  children,
  email,
  organizations,
  activeOrganization,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ecfdf5,_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight"
            >
              ClientFlow
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600 sm:gap-4">
              <Link className="hover:text-teal-800" href="/dashboard">
                Dashboard
              </Link>
              <Link className="hover:text-teal-800" href="/clients">
                Clients
              </Link>
              <Link className="hover:text-teal-800" href="/projects">
                Projects
              </Link>
              <Link className="hover:text-teal-800" href="/documents">
                Documents
              </Link>
              <Link className="hover:text-teal-800" href="/activity">
                Activity
              </Link>
              <Link className="hover:text-teal-800" href="/portal">
                Portal
              </Link>
              <Link className="hover:text-teal-800" href="/onboarding">
                Organizations
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <OrgSwitcher
              organizations={organizations}
              activeOrganizationId={activeOrganization?.id}
            />
            <span className="text-slate-500">{email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
