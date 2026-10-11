# Security

## Threat model (Day 02)

| Risk | Mitigation |
| --- | --- |
| Cross-tenant data access via forged `organization_id` | PostgreSQL RLS on `clients` and `organizations`; app also checks `is_org_member` before writes |
| Session cookie forgery | Server uses `getClaims()` / `getUser()`; never authorize from unverified `getSession()` alone |
| Service-role key leakage | Key is env-only, never imported into client components, omitted from `.env.example` real values |
| Open redirect after login | `safeInternalPath()` allows only same-origin relative paths; rejects `//`, schemes, backslashes, and malformed encodings |
| Auth email redirect hijack | Confirmation links use canonical `NEXT_PUBLIC_SITE_URL` via `getAppOrigin()` — never `Origin` / `Host` / `X-Forwarded-*` |
| Privilege escalation to owner | Only org owners may assign the `owner` role; admins cannot promote themselves; direct owner INSERT policy removed |
| Unauthorized owner bootstrap | Owner membership is created only by `create_organization()` (SECURITY DEFINER) |
| Auth bypass on dashboard routes | Proxy redirects unauthenticated users away from protected paths; pages re-validate with `requireUser()` |

## Secrets handling

- Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Private: `SUPABASE_SERVICE_ROLE_KEY` (integration tests / admin cleanup only)
- `.env*` is gitignored except `.env.example`

## RLS summary

- `profiles`: select/update own row
- `organizations`: select if member; insert if `created_by = auth.uid()`
- `organization_members`: select if member; **no authenticated INSERT policy**; updates:
  - owners may update any membership
  - admins may update only non-owner rows and cannot set `role = owner`
- `clients`: select/insert/update only when `is_org_member(organization_id)`
- Client deletes restricted to owner/admin membership (admins cannot delete owner membership rows)

Helper functions `is_org_member(uuid)` and `has_org_role(uuid, organization_role[])` are `SECURITY DEFINER` with a fixed `search_path` and execute granted only to `authenticated`.

Apply incremental hardening on existing projects:

```text
supabase/migrations/20261011000001_harden_member_role_policies.sql
```

## Residual risks / limitations

- Email confirmation policy depends on Supabase project settings; built-in SMTP is rate-limited on free tiers.
- No application-layer rate limiting yet.
- No audit log for membership or client mutations yet.
- Secretless CI proves lint/typecheck/unit/build only. Live RLS/role integration tests require project credentials and are skipped in GitHub Actions unless secrets are configured.
- `NEXT_PUBLIC_SITE_URL` must match an allow-listed Redirect URL in the Supabase Auth settings.
