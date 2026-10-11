# Security

## Threat model (Day 02)

| Risk | Mitigation |
| --- | --- |
| Cross-tenant data access via forged `organization_id` | PostgreSQL RLS on `clients` and `organizations`; app also checks `is_org_member` before writes |
| Session cookie forgery | Server uses `getClaims()` / `getUser()`; never authorize from unverified `getSession()` alone |
| Service-role key leakage | Key is env-only, never imported into client components, omitted from `.env.example` real values |
| Privilege escalation through membership inserts | Bootstrap insert limited to self-as-owner for orgs the user created; broader member management restricted to owner/admin |
| Auth bypass on dashboard routes | Proxy redirects unauthenticated users away from protected paths; pages re-validate with `requireUser()` |

## Secrets handling

- Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Private: `SUPABASE_SERVICE_ROLE_KEY` (integration tests / admin cleanup only)
- `.env*` is gitignored except `.env.example`

## RLS summary

- `profiles`: select/update own row
- `organizations`: select if member; insert if `created_by = auth.uid()`
- `organization_members`: select if member; constrained insert/manage policies
- `clients`: select/insert/update only when `is_org_member(organization_id)`
- Client deletes restricted to owner/admin membership

Helper functions `is_org_member(uuid)` and `has_org_role(uuid, organization_role[])` are `SECURITY DEFINER` with a fixed `search_path` and execute granted only to `authenticated`. Policies must call these helpers instead of querying `organization_members` directly to avoid recursive RLS evaluation.

## Residual risks / limitations

- Email confirmation policy depends on Supabase project settings.
- No rate limiting at the application layer yet.
- No audit log for membership or client mutations yet.
- Integration RLS proof requires a configured Supabase project; secretless CI cannot claim that proof passed.
