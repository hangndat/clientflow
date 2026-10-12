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
| Unauthorized owner bootstrap | Owner membership is created only by `create_organization()` (SECURITY DEFINER); no authenticated INSERT on `organizations` or `organization_members` |
| Auth bypass on dashboard routes | Proxy redirects unauthenticated users away from protected paths; pages re-validate with `requireUser()` |
| Auth callback host spoofing | Post-auth `Location` uses `getTrustedRedirectOrigin()` — request origin only if allow-listed; else canonical `NEXT_PUBLIC_SITE_URL` |

## Secrets handling

- Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Optional public: `AUTH_ALLOWED_ORIGINS` (comma-separated extra callback origins)
- Private: `SUPABASE_SERVICE_ROLE_KEY` (integration tests / admin cleanup only)
- `.env*` is gitignored except `.env.example`

## RLS summary

- `profiles`: select/update own row
- `organizations`: select if member; **no authenticated INSERT policy** (RPC-only bootstrap); update if owner/admin
- `organization_members`: select if member; **no authenticated INSERT policy**; updates:
  - owners may update any membership
  - admins may update only non-owner rows and cannot set `role = owner`
- `clients`: select/insert/update only when `is_org_member(organization_id)`
- Client deletes restricted to owner/admin membership (admins cannot delete owner membership rows)

Helper functions `is_org_member(uuid)` and `has_org_role(uuid, organization_role[])` are `SECURITY DEFINER` with a fixed `search_path` and execute granted only to `authenticated`.

Apply incremental hardening on existing projects (in order):

```text
supabase/migrations/20261011000001_harden_member_role_policies.sql
supabase/migrations/20261012000000_align_organizations_insert_rpc_only.sql
```

## Auth callback and Supabase Auth settings

1. **Site URL** = `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000` or production origin).
2. **Redirect URLs** allow-list must include every origin that may complete OAuth/PKCE/email links:
   - `{NEXT_PUBLIC_SITE_URL}/auth/callback`
   - `http://localhost:3000/auth/callback` for local work
   - Each preview/staging origin in `AUTH_ALLOWED_ORIGINS` (path `/auth/callback`)
   - Optional Vercel preview: `https://{VERCEL_URL}/auth/callback` when relying on platform `VERCEL_URL`
3. Sign-up `emailRedirectTo` uses canonical `getAppOrigin()` (never request headers).
4. `/auth/callback` uses `getTrustedRedirectOrigin()` for `Location`, `safeInternalPath()` for `next`, and attaches session cookies to the redirect response after PKCE/`verifyOtp` success.

## Residual risks / limitations

- Email confirmation policy depends on Supabase project settings; built-in SMTP is rate-limited on free tiers.
- No application-layer rate limiting yet.
- No audit log for membership or client mutations yet.
- Secretless CI proves lint/typecheck/unit/build only. Live RLS/role integration tests require project credentials and are skipped in GitHub Actions unless secrets are configured.
- Preview hosts must be added to both `AUTH_ALLOWED_ORIGINS` (or `VERCEL_URL`) **and** the Supabase Redirect URL allow-list, or callbacks fall back to the canonical site origin.
- `20261012000000_align_organizations_insert_rpc_only.sql` applied on the configured live project (SQL editor success + post-apply probe). Fresh environments must still run migrations in order.
