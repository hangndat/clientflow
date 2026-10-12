# Development

## Prerequisites

- Node.js 22+
- npm 11+
- A Supabase project for full auth/data flows

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with real project values (including `NEXT_PUBLIC_SITE_URL`). Apply migrations in order:

```text
supabase/migrations/20261011000000_init_tenant_foundation.sql
supabase/migrations/20261011000001_harden_member_role_policies.sql
supabase/migrations/20261012000000_align_organizations_insert_rpc_only.sql
```

If earlier migrations were already applied, run only the missing forward files. Do not edit already-applied migration files as the sole fix.

### Supabase Auth (local / deploy)

| Setting | Value |
| --- | --- |
| Site URL | Same as `NEXT_PUBLIC_SITE_URL` |
| Redirect URLs | `{SITE_URL}/auth/callback`, plus localhost and any preview origins |
| Optional | `AUTH_ALLOWED_ORIGINS` for extra callback hosts |

Recommended local auth settings for demos:

- Confirm email disabled, or
- Configure redirect URL `http://localhost:3000/auth/callback`

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Next.js server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run test:unit` | Validation and route-policy unit tests |
| `npm run test:integration` | RLS tenant isolation (requires secrets) |
| `npm test` | All Vitest suites |
| `npm run build` | Production build |

## Manual acceptance path

1. Sign up with email/password.
2. Create an organization on `/onboarding`.
3. Open `/dashboard` and confirm the org summary.
4. Create a client on `/clients`.
5. Confirm the client appears in the org list.
6. With a second user/org, confirm the first org's clients are invisible.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, tests, and build with placeholder public Supabase env vars. RLS integration assertions execute only when real secrets are available in the local/test environment; otherwise they are skipped.

## Coding conventions

- Feature modules over deep shared abstractions
- Zod validation at Server Action boundaries
- English for code and docs; Vietnamese for developer chat per project rule
- No Day 03 project/document features in this foundation slice
