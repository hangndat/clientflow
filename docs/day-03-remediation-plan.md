# Day 03 Remediation Plan — P0 Blockers

**Date:** 2026-10-12  
**Scope:** Organization INSERT RLS drift + auth callback origin/redirect  
**Out of scope:** Day 03 product features (projects/documents/UI polish)

## Audit findings

### Blocker 1 — Organization INSERT RLS drift

| Source | Behavior |
| --- | --- |
| `20261011000000_init_tenant_foundation.sql` | Creates policy `"Authenticated users can create organizations"` (`created_by = auth.uid()`) |
| Live project (behavioral probe 2026-10-12) | Direct `organizations` INSERT → `42501`; `create_organization` RPC succeeds with `created_by = auth.uid()` and owner membership |
| App code | Onboarding uses RPC only |

**Root cause:** Repo init migration still grants authenticated direct INSERT; live DB (and intended design) require RPC-only bootstrap so org row + owner membership stay atomic. Fresh installs that stop after init would allow orphan org rows without membership.

**Reproduction (authenticated user client):**

1. `INSERT` into `organizations` with `created_by = auth.uid()` → denied on live; would succeed under init-only schema.
2. `rpc('create_organization')` → succeeds; creator is owner.

### Blocker 2 — Auth callback origin

| Path | Origin used today |
| --- | --- |
| Sign-up `emailRedirectTo` | Canonical `getAppOrigin()` / `NEXT_PUBLIC_SITE_URL` |
| `/auth/callback` success/error `Location` | `new URL(request.url).origin` (host the browser hit) |

**Root cause:** Callback trusts the request URL origin without an allow-list. Spoofable or unexpected hosts can diverge from Auth Redirect URL allow-lists and `NEXT_PUBLIC_SITE_URL`. Session cookie attachment also uses `cookies()` helpers rather than binding Set-Cookie to the redirect response (SSR-recommended pattern).

## Remediation

### Phase 2 — RLS

1. Forward-only migration `20261012000000_align_organizations_insert_rpc_only.sql`:
   - `DROP POLICY IF EXISTS "Authenticated users can create organizations"`.
   - Leave SELECT/UPDATE/DELETE org policies unchanged.
   - Keep `create_organization` as the sole authenticated bootstrap path (SECURITY DEFINER, `auth.uid()` checks).
   - No service-role bypass; do not rewrite applied migrations.
2. Integration tests: direct INSERT denied; RPC creates owner; membership self-escalation / cross-tenant INSERT denied.
3. Apply migration on the configured project (non-destructive DROP POLICY). Verify with the same probes. Note: local Supabase CLI/Docker not configured — cannot claim fresh local DB reset.

### Phase 3 — Auth callback

1. Extend origin helpers with an allow-list: canonical site URL, localhost (non-production), optional `AUTH_ALLOWED_ORIGINS`, optional `https://${VERCEL_URL}` when set by the platform.
2. Callback selects redirect origin only if the request origin is allow-listed; otherwise use canonical `getAppOrigin()`.
3. Keep `safeInternalPath()` for `next`; reject open redirects.
4. Build Supabase SSR client that writes session cookies onto the redirect `NextResponse`.
5. Unit tests for origin allow-list + callback success/failure redirects.
6. Document Site URL, Redirect URL allow-list, and env vars.

### Phase 4 — Quality

- Run lint, typecheck, unit, integration (if credentials), build.
- Update `.env.example`, `docs/security.md`, `docs/development.md`, README as needed.
- CI already covers secretless gates; keep integration skip behavior.

## Validation gates

- [ ] Migration applied / policy probe: direct INSERT denied, RPC OK
- [ ] Unit tests for origin + callback
- [ ] Integration RLS tests green when secrets present
- [ ] lint / typecheck / test / build exit 0
- [ ] Manual auth onboarding noted if environment supports it

## Stop conditions honored

- Live schema probed behaviorally (not via `pg_policies` SQL); policy *name* on live may differ, intended *effect* confirmed.
- No production destructive data changes.
- No Day 04 / product-scope expansion.
