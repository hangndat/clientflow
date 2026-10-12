-- Harden tenant integrity: authorize log_activity, same-org FKs, safer portal RPCs.

-- ---------------------------------------------------------------------------
-- log_activity: require authenticated caller who is a member of target_org_id
-- ---------------------------------------------------------------------------
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
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if target_org_id is null then
    raise exception 'Organization is required';
  end if;

  if not public.is_org_member(target_org_id) then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;

  if entity_type is null or char_length(trim(entity_type)) = 0 then
    raise exception 'entity_type is required';
  end if;

  if action is null or char_length(trim(action)) = 0 then
    raise exception 'action is required';
  end if;

  if summary is null or char_length(trim(summary)) = 0 then
    raise exception 'summary is required';
  end if;

  insert into public.activity_events (
    organization_id, actor_id, entity_type, entity_id, action, summary, metadata
  )
  values (
    target_org_id,
    current_user_id,
    trim(entity_type),
    entity_id,
    trim(action),
    trim(summary),
    coalesce(metadata, '{}'::jsonb)
  )
  returning * into event;

  return event;
end;
$$;

revoke all on function public.log_activity(uuid, text, uuid, text, text, jsonb) from public;
grant execute on function public.log_activity(uuid, text, uuid, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Same-tenant referential integrity via composite unique + foreign keys
-- ---------------------------------------------------------------------------

-- Supporting uniqueness for composite FKs
alter table public.clients
  drop constraint if exists clients_id_organization_id_key;
alter table public.clients
  add constraint clients_id_organization_id_key unique (id, organization_id);

alter table public.projects
  drop constraint if exists projects_id_organization_id_key;
alter table public.projects
  add constraint projects_id_organization_id_key unique (id, organization_id);

-- Null out any cross-tenant references before adding FKs (safe on clean/local data).
update public.projects p
set client_id = null
where p.client_id is not null
  and not exists (
    select 1
    from public.clients c
    where c.id = p.client_id
      and c.organization_id = p.organization_id
  );

update public.documents d
set client_id = null
where d.client_id is not null
  and not exists (
    select 1
    from public.clients c
    where c.id = d.client_id
      and c.organization_id = d.organization_id
  );

update public.documents d
set project_id = null
where d.project_id is not null
  and not exists (
    select 1
    from public.projects p
    where p.id = d.project_id
      and p.organization_id = d.organization_id
  );

delete from public.portal_tokens t
where not exists (
  select 1
  from public.clients c
  where c.id = t.client_id
    and c.organization_id = t.organization_id
);

alter table public.projects
  drop constraint if exists projects_client_same_organization_fkey;
alter table public.projects
  add constraint projects_client_same_organization_fkey
  foreign key (client_id, organization_id)
  references public.clients (id, organization_id)
  on delete set null;

alter table public.documents
  drop constraint if exists documents_client_same_organization_fkey;
alter table public.documents
  add constraint documents_client_same_organization_fkey
  foreign key (client_id, organization_id)
  references public.clients (id, organization_id)
  on delete set null;

alter table public.documents
  drop constraint if exists documents_project_same_organization_fkey;
alter table public.documents
  add constraint documents_project_same_organization_fkey
  foreign key (project_id, organization_id)
  references public.projects (id, organization_id)
  on delete set null;

alter table public.portal_tokens
  drop constraint if exists portal_tokens_client_same_organization_fkey;
alter table public.portal_tokens
  add constraint portal_tokens_client_same_organization_fkey
  foreign key (client_id, organization_id)
  references public.clients (id, organization_id)
  on delete cascade;

-- Keep single-column FKs for cascade clarity where still useful; Postgres allows both.
-- Drop redundant single-column client FKs that conflict with composite semantics? 
-- Leave original client_id / project_id FKs — they still enforce existence.
-- Composite FKs additionally enforce same organization_id.

-- ---------------------------------------------------------------------------
-- Portal RPCs: join on organization_id to prevent metadata mismatch disclosure
-- ---------------------------------------------------------------------------
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
  if token_hash is null or char_length(trim(token_hash)) = 0 then
    return;
  end if;

  return query
  select
    t.id,
    t.organization_id,
    t.client_id,
    c.name,
    o.name
  from public.portal_tokens t
  join public.clients c
    on c.id = t.client_id
   and c.organization_id = t.organization_id
  join public.organizations o
    on o.id = t.organization_id
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
  join public.clients c
    on c.id = t.client_id
   and c.organization_id = t.organization_id
  where t.token_hash = portal_list_projects.token_hash
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now());
$$;

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
  join public.clients c
    on c.id = t.client_id
   and c.organization_id = t.organization_id
  where t.token_hash = portal_list_documents.token_hash
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now())
    and d.visibility = 'client';
$$;

-- Authorized portal document path lookup (no storage_path leak without valid token + client visibility)
create or replace function public.portal_get_document(
  token_hash text,
  document_id uuid
)
returns table (
  id uuid,
  title text,
  storage_path text,
  mime_type text,
  size_bytes bigint
)
language sql
security definer
set search_path = public
as $$
  select d.id, d.title, d.storage_path, d.mime_type, d.size_bytes
  from public.documents d
  join public.portal_tokens t
    on t.organization_id = d.organization_id
   and t.client_id = d.client_id
  join public.clients c
    on c.id = t.client_id
   and c.organization_id = t.organization_id
  where t.token_hash = portal_get_document.token_hash
    and d.id = portal_get_document.document_id
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now())
    and d.visibility = 'client';
$$;

revoke all on function public.portal_get_document(text, uuid) from public;
grant execute on function public.portal_get_document(text, uuid) to anon, authenticated;
