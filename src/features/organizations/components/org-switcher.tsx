"use client";

import { selectOrganizationAction } from "@/features/organizations/actions/organization";
import type { Organization } from "@/types/database";

type OrgSwitcherProps = {
  organizations: Organization[];
  activeOrganizationId?: string;
};

export function OrgSwitcher({
  organizations,
  activeOrganizationId,
}: OrgSwitcherProps) {
  if (organizations.length === 0) {
    return null;
  }

  return (
    <form action={selectOrganizationAction} className="flex items-center gap-2">
      <label className="text-slate-500" htmlFor="organizationId">
        Org
      </label>
      <select
        id="organizationId"
        name="organizationId"
        defaultValue={activeOrganizationId}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </form>
  );
}
