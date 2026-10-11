# Day 02 Review — ClientFlow Foundation

**Date:** 2026-10-11
**Scope:** Authenticated multi-tenant foundation + security verification
**Repository path:** `/Users/admin/SideProject/clientflow`
**Code baseline:** `94abd04` (`fix(clientflow): resolve CI and harden auth redirects`)

## Acceptance checklist

| Criterion | Status | Notes |
| --- | --- | --- |
| Foundation + vertical slice | Verified | Auth, org, clients, docs, CI scaffold |
| GitHub Actions (secretless) | Verified | Run on `94abd04` — success; 20 passed, 2 integration skipped |
| Membership hardening migration on live DB | Verified applied | Probe: admin self-promotion blocked; forged owner INSERT blocked |
| Credentialed RLS — cross-tenant | Verified live | Integration suite passed |
| Credentialed RLS — role hardening | Verified live | Integration suite passed |
| Day 03 features absent | Observed | No projects/documents module |

## Migration status

| Migration | Live project |
| --- | --- |
| `20261011000000_init_tenant_foundation.sql` | Applied (earlier) |
| `20261011000001_harden_member_role_policies.sql` | **Applied** — behavioral probe confirmed; no DDL re-run needed (avoided reset/drop) |

Probe results (ephemeral users cleaned up; no secrets logged):

- `hardening_migration_applied: true`
- Admin promote to owner: blocked (`role` remained `admin`)
- Forged owner membership INSERT: blocked
- Direct `organizations` INSERT by authenticated user: blocked (`42501` RLS) on this project

## CI results (GitHub Actions)

- Workflow: [CI / verify @ 94abd04](https://github.com/hangndat/clientflow/actions/runs/38139219095)
- Conclusion: **success**
- Secretless tests: **20 passed**, **2 skipped** (credentialed RLS suites)
- Distinguishes from local credentialed evidence below

## Local verification (this session)

### Credentialed integration

```bash
npm run test:integration
# exit 0
# prevents cross-tenant client reads and writes — passed (~4.1s)
# blocks unauthorized owner bootstrap and admin self-promotion — passed (~4.5s)
```

### Full local suite + quality gates

```bash
npm run lint        # exit 0
npm run typecheck   # exit 0
npm test            # exit 0 — 20 passed, 2 skipped when suites re-run with credentials: both RLS cases passed again (~2.8–3.0s each)
npm run build       # exit 0
```

Note: `npm test` in this session loaded `.env.local`, so integration cases **ran and passed** (not skipped). GitHub Actions without secrets still skips those two cases — that is expected.

## Remaining risks (reviewed)

1. **Callback redirect origin:** `/auth/callback` builds success/error `Location` from the request URL `origin` (the host the browser hit). Post-auth `next` is sanitized by `safeInternalPath()`. Email confirmation links use canonical `getAppOrigin()` / `NEXT_PUBLIC_SITE_URL`, not request headers. Residual: deploy behind unexpected hosts must keep Auth redirect allow-list aligned with `NEXT_PUBLIC_SITE_URL`.
2. **Direct organization INSERT:** App onboarding uses `create_organization()` RPC only. Live DB currently **rejects** direct `organizations` INSERT via RLS (`42501`). Init SQL still documents an authenticated INSERT policy — treat repo SQL vs live policy set as a drift to keep in mind on fresh environments; prefer RPC-only bootstrap.
3. **Secretless CI cannot prove RLS:** Actions green ≠ live tenant isolation proof; credentialed tests remain a local/ops responsibility unless secrets are added carefully to CI.
4. **Email/SMTP:** Built-in Supabase email remains rate-limited; confirm-email settings are project-specific.
5. **No app-layer rate limits / audit log** yet (Day 02 non-goals).

## Suggested commit (docs only; not created)

```text
docs(clientflow): record Day 02 live RLS verification evidence
```

Portfolio hub progress should be updated in the same verification window after this file lands.
