# Day 03 Product Continuation — Verification Evidence

**Baseline commit:** `0271a1dd04fa189640c38d87b39c896e0b2734ba`  
**Date:** 2026-10-12

## 1. Organization INSERT policies (`pg_policies`)

Isolated local Supabase (fresh migrate of all SQL files):

```text
npx supabase start
psql $DB_URL -f scripts/verify-org-insert-policies.sql
```

Observed policies on `organizations` / `organization_members`:

| Table | Policy | cmd |
| --- | --- | --- |
| organizations | Members can view their organizations | SELECT |
| organizations | Owners and admins can update organizations | UPDATE |
| organization_members | Members can view membership in their orgs | SELECT |
| organization_members | Owners can update memberships | UPDATE |
| organization_members | Admins can update non-owner memberships | UPDATE |
| organization_members | Owners and admins can delete non-owner members | DELETE |

**INSERT policies:** `0` rows (confirmed). Direct INSERT denied; `create_organization` RPC remains bootstrap path.

**Live hosted catalog (`pg_policies`):** not re-queried in-session (Supabase dashboard session expired). Live behavioral probes from P0 remediation remain the live evidence (`42501` on direct INSERT). Re-run `scripts/verify-org-insert-policies.sql` in the SQL editor to refresh catalog proof.

## 2. Auth callback session cookie persistence

Stack: local Next.js `:3001` + local Supabase Auth (`enable_confirmations = false`).

HTTP probe (`token_hash` magic link → `/auth/callback`):

- Status `307` → `http://localhost:3001/onboarding`
- `Set-Cookie`: `sb-127-auth-token` present
- Follow-up GET with cookie jar → `200` onboarding

Browser probe: same callback URL opened in Cursor browser → landed on `/onboarding` with authenticated shell (user email + Sign out visible).

## 3. Credentialed RLS on isolated DB

```bash
SKIP_DOTENV=1 INTEGRATION_REQUIRED=1 \
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  …keys… \
  npm run test:integration:required
# 3 passed, 0 skipped
```

## 4. CI posture

- `.github/workflows/ci.yml` — secretless lint/typecheck/unit/build (no credentialed RLS).
- `.github/workflows/integration-release.yml` — starts isolated Supabase, asserts zero INSERT policies, runs `test:integration:required`, fails on skips.
