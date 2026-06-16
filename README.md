# Houseplant Hospital 2.0

Internal operations app for Hilda's Houseplant Hospital.

## Quick start

```bash
cp .env.example .env.local
# Add Supabase keys to .env.local
npm install
npm run dev
```

See [docs/SETUP.md](docs/SETUP.md) for migrations, first admin user, and verification.

## Scope

Product requirements: [Houseplant-Hospital-2.0-Scope.md](Houseplant-Hospital-2.0-Scope.md)

Issue tracking: Linear workspace `Houseplant-Hospital`, `HIL-*` issues only.

## Stack

- Next.js 16 (App Router)
- Supabase (Postgres, Auth, Storage, RLS)
- Tailwind CSS 4 + shadcn/ui (neutral theme for now)
