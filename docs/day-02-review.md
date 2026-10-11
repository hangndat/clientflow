# Day 02 Review — ClientFlow Foundation

**Date:** 2026-10-11
**Scope:** Authenticated multi-tenant foundation + review remediation
**Repository path:** `/Users/admin/SideProject/clientflow`
**Reviewed baseline:** `9f68d2b`

## Acceptance checklist

| Criterion | Status | Notes |
| --- | --- | --- |
| Next.js/TS/Tailwind/Supabase foundation | Implemented | Next.js 16 App Router + `@supabase/ssr` |
| Secretless CI commands (local clean) | Verified locally | lint/typecheck/unit+skipped-RLS/build exit 0 without `.next` |
| GitHub Actions green | Pending | Do not claim Day 02 complete until Actions passes after push |
| RLS tenant isolation | Verified live (credentialed) | Cross-tenant denial passed after remediation |
| Membership role hardening SQL | Coded | Apply `20261011000001_harden_member_role_policies.sql` on live project |
| Membership role integration | Blocked until SQL apply | Admin self-promotion still succeeded on live DB pre-migration |
| Day 03 features absent | Observed | No projects/documents module |

## Remediation root causes

1. **CI `LayoutProps`:** type comes from generated `.next/types`; CI runs `tsc` before `next build`.
2. **Open redirect:** `next.startsWith("/")` accepted `//evil.example` and similar.
3. **Email redirect origin:** signup trusted request `Origin` / `Host` headers.
4. **Owner privilege:** admins could `UPDATE` membership `role` to `owner`; bootstrap INSERT policy was unnecessary with SECURITY DEFINER RPC.

## Verification log (remediation session)

### Secretless / CI-equivalent (placeholder env, no service role)

```bash
rm -rf .next node_modules && npm ci          # exit 0
NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-anon-key-for-ci-build \
npm run lint                                 # exit 0
npm run typecheck                            # exit 0
npm test                                     # exit 0 (20 passed, 2 skipped)
npm run build                                # exit 0
```

### Credentialed local integration

```bash
npm run test:integration
```

| Suite | Result |
| --- | --- |
| Cross-tenant client isolation | **passed** (~4.0s) |
| Admin self-promotion / forged owner bootstrap | **failed** — admin could still set `role=owner` because migration `00001` not yet applied on the live project |

### GitHub Actions

Not verified in this session (no commit/push requested). Required after landing the fix:

1. Push branch/commit
2. Confirm workflow **CI / verify** is green for lint, typecheck, test, build

## Required live DB step

In Supabase SQL Editor, run:

```text
supabase/migrations/20261011000001_harden_member_role_policies.sql
```

Then re-run `npm run test:integration` and expect both suites to pass.

## Suggested commit

```text
fix(clientflow): resolve CI and harden auth redirects
```

Do not claim Day 02 complete until GitHub Actions passes for this fix.
