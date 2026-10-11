# Architecture

## Purpose

ClientFlow is a multi-tenant client portal. Day 02 delivers the authenticated tenant foundation: users, organizations, membership, and organization-scoped clients.

## System context

```text
Browser
  -> Next.js App Router (UI + Server Actions)
  -> Supabase Auth (email/password sessions in cookies)
  -> Supabase Postgres (RLS-enforced tenant data)
```

## Application layout

- `src/app`: route entry points and layouts only
- `src/features/auth`: signup, login, logout actions and forms
- `src/features/organizations`: create/select organization flow
- `src/features/clients`: create/list clients for the active org
- `src/lib/supabase`: browser, server, and proxy clients using `@supabase/ssr`
- `supabase/migrations`: schema, helper functions, and RLS policies

## Data boundaries

| Entity | Ownership boundary |
| --- | --- |
| `profiles` | 1:1 with `auth.users`; users read/update only their own row |
| `organizations` | Visible only to members |
| `organization_members` | Membership rows visible to org members |
| `clients` | Strictly scoped by `organization_id` + membership |

Organization creation uses the `create_organization(name, slug)` SECURITY DEFINER RPC so the org row and owner membership are inserted atomically.

## Auth and session model

1. Browser and Server Components use the publishable/anon key only.
2. Next.js `src/proxy.ts` refreshes sessions with `supabase.auth.getClaims()`.
3. Protected pages call `supabase.auth.getUser()` before loading tenant data.
4. Active organization preference is stored in an HTTP-only cookie (`cf_active_org`) and re-checked against membership before use.

## Request flow (vertical slice)

1. User signs up or signs in.
2. Proxy validates/refreshes the session cookie.
3. User creates or selects an organization.
4. Dashboard and clients pages resolve the active org from membership.
5. Client inserts/selects go through Supabase with the user JWT; RLS rejects foreign org IDs.

## Non-goals for Day 02

- Projects and documents
- Invitations and billing
- Role-admin UI beyond schema support for `owner | admin | member`
- Deployment automation beyond CI verification
