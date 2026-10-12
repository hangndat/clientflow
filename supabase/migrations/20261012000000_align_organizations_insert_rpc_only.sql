-- Align organizations INSERT with RPC-only bootstrap.
--
-- Drift: 20261011000000 created policy "Authenticated users can create organizations",
-- which allows authenticated clients to insert org rows without owner membership.
-- Intended design (and observed live project behavior): only
-- public.create_organization(name, slug) (SECURITY DEFINER) creates the org +
-- owner membership atomically. Direct INSERT must be denied by RLS.
--
-- SELECT / UPDATE / DELETE organization policies are unchanged.
-- organization_members still has no authenticated INSERT policy.

drop policy if exists "Authenticated users can create organizations"
  on public.organizations;

-- Ensure bootstrap RPC remains the only authenticated path and still enforces
-- auth + ownership. Re-apply grants idempotently for environments that drifted.
create or replace function public.create_organization(org_name text, org_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if org_name is null or char_length(trim(org_name)) = 0 then
    raise exception 'Organization name is required';
  end if;

  if org_slug is null or org_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid organization slug';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(org_name), org_slug, current_user_id)
  returning * into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org.id, current_user_id, 'owner');

  return new_org;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;
