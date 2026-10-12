-- ClientFlow product core: projects, documents, activity, portal tokens

create type public.project_status as enum (
  'planned',
  'active',
  'blocked',
  'completed',
  'cancelled'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  status public.project_status not null default 'planned',
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (char_length(trim(name)) > 0)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  visibility text not null default 'internal'
    check (visibility in ('internal', 'client')),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_title_not_blank check (char_length(trim(title)) > 0),
  constraint documents_storage_path_unique unique (storage_path)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.portal_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  token_hash text not null unique,
  label text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index projects_organization_id_idx on public.projects (organization_id);
create index projects_client_id_idx on public.projects (client_id);
create index documents_organization_id_idx on public.documents (organization_id);
create index documents_project_id_idx on public.documents (project_id);
create index documents_client_id_idx on public.documents (client_id);
create index activity_events_organization_created_idx
  on public.activity_events (organization_id, created_at desc);
create index portal_tokens_client_id_idx on public.portal_tokens (client_id);
create index portal_tokens_token_hash_idx on public.portal_tokens (token_hash);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- Activity helper (SECURITY DEFINER so RLS inserts succeed from triggers/RPC).
create or replace function public.log_activity(
  target_org_id uuid,
  entity_type text,
  entity_id uuid,
  action text,
  summary text,
  metadata jsonb default '{}'::jsonb
)
returns public.activity_events
language plpgsql
security definer
set search_path = public
as $$
declare
  event public.activity_events;
begin
  insert into public.activity_events (
    organization_id, actor_id, entity_type, entity_id, action, summary, metadata
  )
  values (
    target_org_id,
    auth.uid(),
    entity_type,
    entity_id,
    action,
    summary,
    coalesce(metadata, '{}'::jsonb)
  )
  returning * into event;

  return event;
end;
$$;

revoke all on function public.log_activity(uuid, text, uuid, text, text, jsonb) from public;
grant execute on function public.log_activity(uuid, text, uuid, text, text, jsonb) to authenticated;

-- Portal token lookup for anonymous portal viewers (hash only; never stores raw token).
create or replace function public.resolve_portal_token(token_hash text)
returns table (
  portal_token_id uuid,
  organization_id uuid,
  client_id uuid,
  client_name text,
  organization_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    t.id,
    t.organization_id,
    t.client_id,
    c.name,
    o.name
  from public.portal_tokens t
  join public.clients c on c.id = t.client_id
  join public.organizations o on o.id = t.organization_id
  where t.token_hash = resolve_portal_token.token_hash
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now());

  update public.portal_tokens
  set last_used_at = now()
  where public.portal_tokens.token_hash = resolve_portal_token.token_hash
    and revoked_at is null
    and (expires_at is null or expires_at > now());
end;
$$;

revoke all on function public.resolve_portal_token(text) from public;
grant execute on function public.resolve_portal_token(text) to anon, authenticated;

create or replace function public.portal_list_projects(token_hash text)
returns setof public.projects
language sql
security definer
set search_path = public
as $$
  select p.*
  from public.projects p
  join public.portal_tokens t
    on t.organization_id = p.organization_id
   and t.client_id = p.client_id
  where t.token_hash = portal_list_projects.token_hash
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now());
$$;

revoke all on function public.portal_list_projects(text) from public;
grant execute on function public.portal_list_projects(text) to anon, authenticated;

create or replace function public.portal_list_documents(token_hash text)
returns setof public.documents
language sql
security definer
set search_path = public
as $$
  select d.*
  from public.documents d
  join public.portal_tokens t
    on t.organization_id = d.organization_id
   and t.client_id = d.client_id
  where t.token_hash = portal_list_documents.token_hash
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now())
    and d.visibility = 'client';
$$;

revoke all on function public.portal_list_documents(text) from public;
grant execute on function public.portal_list_documents(text) to anon, authenticated;

alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.activity_events enable row level security;
alter table public.portal_tokens enable row level security;

-- projects
create policy "Members can view projects in their organization"
  on public.projects for select to authenticated
  using (public.is_org_member(organization_id));

create policy "Members can create projects in their organization"
  on public.projects for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = auth.uid()
  );

create policy "Members can update projects in their organization"
  on public.projects for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "Owners and admins can delete projects"
  on public.projects for delete to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  );

-- documents
create policy "Members can view documents in their organization"
  on public.documents for select to authenticated
  using (public.is_org_member(organization_id));

create policy "Members can create documents in their organization"
  on public.documents for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and uploaded_by = auth.uid()
  );

create policy "Members can update documents in their organization"
  on public.documents for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "Owners and admins can delete documents"
  on public.documents for delete to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  );

-- activity
create policy "Members can view activity in their organization"
  on public.activity_events for select to authenticated
  using (public.is_org_member(organization_id));

-- no direct insert/update/delete for authenticated — use log_activity()

-- portal tokens (staff manage; anon uses SECURITY DEFINER RPCs only)
create policy "Members can view portal tokens in their organization"
  on public.portal_tokens for select to authenticated
  using (public.is_org_member(organization_id));

create policy "Owners and admins can create portal tokens"
  on public.portal_tokens for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
    and created_by = auth.uid()
  );

create policy "Owners and admins can update portal tokens"
  on public.portal_tokens for update to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  )
  with check (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  );

create policy "Owners and admins can delete portal tokens"
  on public.portal_tokens for delete to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  );

-- Private storage bucket for organization documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-documents',
  'org-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "Org members can read org document objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'org-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "Org members can upload org document objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-documents'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "Owners and admins can delete org document objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-documents'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin']::public.organization_role[]
    )
  );
