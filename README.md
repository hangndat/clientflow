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

## Features (Day 02 foundation)

1. Email/password signup and login via Supabase Auth
2. Server-side session refresh through Next.js `proxy.ts` + `@supabase/ssr`
3. Organization create/select onboarding
4. Protected dashboard
5. Create and list clients for the active organization
6. PostgreSQL RLS policies that deny cross-tenant access

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
4. Apply the SQL migration in the Supabase SQL editor or CLI:

```bash
# SQL file
supabase/migrations/20261011000000_init_tenant_foundation.sql
```

5. In Authentication settings, disable email confirmation for local demos or configure the auth callback URL:

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
npm test
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
- [Day 02 review](docs/day-02-review.md)

## Known limitations

- No project/document management yet (Day 03 scope).
- Organization invite flows are not implemented; members are created through the `create_organization` RPC as owners.
- End-to-end browser tests are not included in Day 02.
- RLS integration tests require a live Supabase project and are skipped in secretless CI.

## Suggested first commit

```text
feat(clientflow): establish authenticated tenant foundation
```
