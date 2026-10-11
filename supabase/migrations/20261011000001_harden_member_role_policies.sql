-- Harden organization membership role changes for existing databases.
-- Fresh installs already get these rules from 20261011000000_init_tenant_foundation.sql.

drop policy if exists "Users can insert themselves as owner during bootstrap"
  on public.organization_members;

drop policy if exists "Owners and admins can update members"
  on public.organization_members;

drop policy if exists "Owners and admins can delete members"
  on public.organization_members;

drop policy if exists "Owners can update memberships"
  on public.organization_members;

drop policy if exists "Admins can update non-owner memberships"
  on public.organization_members;

drop policy if exists "Owners and admins can delete non-owner members"
  on public.organization_members;

-- Owner membership bootstrap is only allowed through create_organization().

create policy "Owners can update memberships"
  on public.organization_members
  for update
  to authenticated
  using (public.has_org_role(organization_id, array['owner']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));

create policy "Admins can update non-owner memberships"
  on public.organization_members
  for update
  to authenticated
  using (
    public.has_org_role(organization_id, array['admin']::public.organization_role[])
    and role <> 'owner'
  )
  with check (
    public.has_org_role(organization_id, array['admin']::public.organization_role[])
    and role <> 'owner'
  );

create policy "Owners and admins can delete non-owner members"
  on public.organization_members
  for delete
  to authenticated
  using (
    (
      public.has_org_role(organization_id, array['owner']::public.organization_role[])
    )
    or (
      public.has_org_role(organization_id, array['admin']::public.organization_role[])
      and role <> 'owner'
    )
  );
