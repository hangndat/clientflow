# Day 03 Review — P0 Blocker Remediation

**Date:** 2026-10-12  
**Scope:** Organization INSERT RLS drift + auth callback origin/redirect  
**Out of scope:** Full product Day 03 (projects/documents/UI polish/deploy/demo)

## Acceptance checklist

| Criterion | Status | Notes |
| --- | --- | --- |
| Root cause recorded for both blockers | Done | See remediation plan |
| Forward migration for org INSERT alignment | Done | `20261012000000_align_organizations_insert_rpc_only.sql` |
| Live migration DDL applied | **Applied** | Operator ran SQL editor; result `Success. No rows returned`. Post-apply probe + integration test below. |
| Auth callback trusted origin + safe `next` | Done | `getTrustedRedirectOrigin()` + `safeInternalPath()` |
| Session cookies on callback redirect | Done | SSR client binds Set-Cookie to redirect response |
| Unit + integration tests | Verified | See commands below |
| lint / typecheck / build | Verified | exit 0 |
| Fresh local Supabase reset | **Not available** | No Supabase CLI/Docker/`config.toml` in this environment |
| Manual browser auth onboarding | **Not run** this session | Automated RLS + callback unit coverage only |

## Commands run

```bash
npm run lint        # exit 0
npm run typecheck   # exit 0
npm run test:unit   # exit 0 — 30 passed
npm test            # exit 0 — 33 passed, 3 skipped (skip placeholders)
npm run build       # exit 0
```

Credentialed integration (via `.env.local`):

- `rls-organization-insert` — passed (~3.5s)
- `rls-tenant-isolation` — passed (~4.0s)
- `rls-member-roles` — passed (~4.5s)

## Live migration apply

Applied via Supabase SQL editor (operator-confirmed: `Success. No rows returned`).

Post-apply probe (2026-10-12):

- Direct `organizations` INSERT → denied (`42501`)
- `create_organization` RPC → success; `created_by` matches caller; owner membership present
- Integration suite: 3 passed, 3 skipped placeholders

```text
supabase/migrations/20261012000000_align_organizations_insert_rpc_only.sql
```

## Suggested commit

```text
fix(clientflow): align org INSERT RLS and harden auth callback origin
```
