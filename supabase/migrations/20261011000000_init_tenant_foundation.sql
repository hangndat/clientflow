-- ClientFlow tenant foundation
-- profiles, organizations, organization_members, clients + RLS

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_slug_unique unique (slug)
);

create type public.organization_role as enum ('owner', 'admin', 'member');

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  constraint organization_members_unique unique (organization_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  company text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_not_blank check (char_length(trim(name)) > 0)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index organization_members_user_id_idx
  on public.organization_members (user_id);

create index organization_members_organization_id_idx
  on public.organization_members (organization_id);

create index clients_organization_id_idx
  on public.clients (organization_id);

create index clients_organization_id_created_at_idx
  on public.clients (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Membership checks used by RLS. SECURITY DEFINER avoids recursive policy checks.
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(
  target_org_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.role = any (allowed_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.organization_role[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;

-- Atomic org creation: insert organization + owner membership.
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.clients enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- organizations: members only
create policy "Members can view their organizations"
  on public.organizations
  for select
  to authenticated
  using (public.is_org_member(id));

create policy "Authenticated users can create organizations"
  on public.organizations
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Owners and admins can update organizations"
  on public.organizations
  for update
  to authenticated
  using (public.has_org_role(id, array['owner', 'admin']::public.organization_role[]))
  with check (public.has_org_role(id, array['owner', 'admin']::public.organization_role[]));

-- organization_members
create policy "Members can view membership in their orgs"
  on public.organization_members
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- No direct INSERT policy: owner membership is created only by
-- public.create_organization(...) (SECURITY DEFINER), which bypasses RLS.

create policy "Owners can update memberships"
  on public.organization_members
  for update
  to authenticated
  using (public.has_org_role(organization_id, array['owner']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));

-- Admins may manage admin/member rows only; they cannot touch owner rows
-- or promote anyone (including themselves) to owner.
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

-- clients: tenant-scoped
create policy "Members can view clients in their organization"
  on public.clients
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "Members can create clients in their organization"
  on public.clients
  for insert
  to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = auth.uid()
  );

create policy "Members can update clients in their organization"
  on public.clients
  for update
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "Owners and admins can delete clients"
  on public.clients
  for delete
  to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  );
