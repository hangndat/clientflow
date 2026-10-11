import { CreateOrganizationForm } from "@/features/organizations/components/create-organization-form";
import { selectOrganizationAction } from "@/features/organizations/actions/organization";
import { requireUser } from "@/lib/auth";
import { resolveActiveOrganization } from "@/lib/organization";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const { organizations, activeOrganization } = await resolveActiveOrganization(
    supabase,
    user.id,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-teal-700">
          Organizations
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-slate-900">
          Create or select a workspace
        </h1>
        <p className="mt-2 text-slate-600">
          Every client record belongs to exactly one organization. Membership
          determines what you can see.
        </p>
      </section>

      {organizations.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Your organizations
          </h2>
          <ul className="mt-4 space-y-3">
            {organizations.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{org.name}</p>
                  <p className="text-sm text-slate-500">{org.slug}</p>
                </div>
                <form action={selectOrganizationAction}>
                  <input type="hidden" name="organizationId" value={org.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    {activeOrganization?.id === org.id ? "Selected" : "Select"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-teal-300 bg-teal-50/70 p-6">
          <p className="text-sm text-teal-900">
            You are not a member of any organization yet. Create one to unlock
            the dashboard and client list.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Create organization
        </h2>
        <div className="mt-4">
          <CreateOrganizationForm />
        </div>
      </section>
    </div>
  );
}
