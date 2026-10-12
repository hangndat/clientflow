# ClientFlow Technical Case Study

**Product:** Multi-tenant SaaS client portal  
**Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth + Postgres RLS + Storage  
**Baseline (P0 complete):** `0271a1d`  
**Product continuation commits:** `8dfffe6`, `aa23295`, `f18bd93` (+ E2E follow-ups)

## Problem

Agencies need a tenant-safe place to manage clients, projects, and shared files without leaking data across organizations. Showcase constraints required real authorization boundaries, not demo-only UI filters.

## Architecture decisions

1. **RLS as primary tenant gate** — Application membership checks are defense-in-depth. Cross-tenant denial is proven with credentialed integration tests against an isolated local Supabase stack.
2. **RPC-only organization bootstrap** — `create_organization` inserts org + owner membership atomically. Direct `organizations` / `organization_members` INSERT policies are absent (verified via `pg_policies`).
3. **Trusted auth callback origins** — Post-auth redirects use an allow-list (`NEXT_PUBLIC_SITE_URL`, `AUTH_ALLOWED_ORIGINS`, optional `VERCEL_URL`) rather than trusting arbitrary Host headers. Session cookies are bound to the redirect response.
4. **Hashed portal tokens** — External client portal links store SHA-256 hashes only. Anon access goes through SECURITY DEFINER RPCs that expose only that client’s projects and `visibility='client'` documents.
5. **Private storage paths** — Documents live in `org-documents` under `{organization_id}/…` with storage RLS tied to `is_org_member`.

## What shipped (evidence-backed)

| Area | Evidence |
| --- | --- |
| Org INSERT policy alignment | Local `pg_policies` (0 INSERT policies); live behavioral `42501` from P0 |
| Auth callback cookies | Playwright + Cursor browser: `sb-*-auth-token` set, `/onboarding` authenticated |
| Client/Project CRUD | App routes + server actions + RLS integration |
| Documents | Upload/delete with private bucket policies |
| Portal | Admin link issuance + `/portal/[token]` external view |
| Activity timeline | `log_activity` RPC + `/activity` UI |
| Secretless CI | `.github/workflows/ci.yml` unit/build only |
| Integration release gate | `.github/workflows/integration-release.yml` local Supabase, non-skippable |

## Limitations (honest)

- Hosted production migration `20261012010000_product_core.sql` still requires operator apply on the live Supabase project.
- Production deployment URL / Vercel evidence is **not** claimed in this document until a deploy run is recorded.
- Playwright browser download of Chromium headless shell hangs on this Mac host; E2E was executed with system Chrome (`PLAYWRIGHT_CHANNEL=chrome`).
- Demo video not recorded in this session.
- No invite/billing flows; portal tokens are the external access mechanism for Day 03.

## Trade-offs

- SECURITY DEFINER RPCs for portal/bootstrap concentrate privilege — mitigated with fixed `search_path`, hash-only tokens, and no service-role usage in app request paths.
- Activity logging failures are non-blocking to avoid turning audit writes into user-facing outages.
