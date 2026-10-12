# ClientFlow

Multi-tenant SaaS client portal foundation built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase (Auth + PostgreSQL RLS).

This repository is a portfolio showcase of production-minded tenancy boundaries: authentication, organization membership, and tenant-safe client records.

## Stack

- Next.js 16 (App Router)
- TypeScript (strict)
- Tailwind CSS
- Supabase Auth + PostgreSQL + Row Level Security
- Vitest
- GitHub Actions CI

## Features

1. Email/password signup and login via Supabase Auth (trusted callback origins + cookie-bound PKCE exchange)
2. Server-side session refresh through Next.js `proxy.ts` + `@supabase/ssr`
3. Organization create/select onboarding (`create_organization` RPC only)
4. Protected dashboard with activity summary
5. Client CRUD, Project CRUD, secure document uploads (private Storage bucket)
6. External client portal links (hashed tokens)
7. Organization activity timeline
8. PostgreSQL RLS policies that deny cross-tenant access
9. Secretless CI + separate non-skippable integration release gate (local Supabase)

## Quick start

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Configure Supabase

1. Create a Supabase project.
2. Copy the project URL and publishable (or anon) key into `.env.local`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only for integration tests.
4. Apply SQL migrations in order (SQL editor or CLI):

```text
supabase/migrations/20261011000000_init_tenant_foundation.sql
supabase/migrations/20261011000001_harden_member_role_policies.sql
supabase/migrations/20261012000000_align_organizations_insert_rpc_only.sql
supabase/migrations/20261012010000_product_core.sql
```

Local isolated database (recommended for RLS gates):

```bash
npm run db:start
npm run test:integration:required
```

5. In Authentication settings:
   - **Site URL** = `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
   - **Redirect URLs** include `{SITE_URL}/auth/callback` (and preview origins if used)
   - For local demos you may disable email confirmation

```text
http://localhost:3000/auth/callback
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification commands

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration:required   # requires local Supabase or real secrets
npm run test:e2e                    # requires app running + browsers
npm run build
```

RLS integration tests run automatically when these are present:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`

Without those secrets, integration cases are skipped and documented as blocked.

## Project structure

```text
src/
  app/                 # App Router pages and layouts
  components/          # Shared UI shell pieces
  features/            # Auth, organizations, clients vertical slices
  lib/                 # Supabase clients, auth helpers, validations
  types/               # Database types
supabase/migrations/   # Versioned SQL schema + RLS
tests/                 # Unit + optional RLS integration tests
docs/                  # Architecture, security, development notes
```

## Documentation

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Development](docs/development.md)
- [Case study](docs/case-study.md)
- [Day 02 review](docs/day-02-review.md)
- [Day 03 remediation plan](docs/day-03-remediation-plan.md)
- [Day 03 product verification](docs/day-03-product-verification.md)

## Known limitations

- Hosted Supabase still needs `20261012010000_product_core.sql` applied before production product features work there.
- Production deploy URL / demo video are tracked separately once evidence exists.
- Organization invite/billing flows are not implemented; portal tokens cover external client access.
- Secretless CI skips credentialed RLS; use the integration release gate (or local `db:start`) for non-skippable proof.

## Suggested first commit

```text
feat(clientflow): establish authenticated tenant foundation
```
