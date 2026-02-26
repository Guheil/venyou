# VenYOU

VenYOU is a Next.js app for event planning with secure Supabase auth and database-backed events.

## Stack

- Next.js (App Router)
- Supabase Auth
- Supabase Postgres + RLS
- React + TypeScript

## 1. Install

```bash
npm install
```

## 2. Configure env (only required file edit)

Create `.env` from `.env.example` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Optional but recommended for production OAuth redirects
NEXT_PUBLIC_SITE_URL=https://venyou-five.vercel.app
```

## 3. Create database schema (one-time)

In Supabase SQL Editor, run the SQL from [`supabase/schema.sql`](./supabase/schema.sql).

This creates:
- `public.events` table
- indexes for fast per-user queries
- row-level security (RLS) policies so users only access their own rows

In Supabase Auth settings:
- `Site URL`: `https://venyou-five.vercel.app` (production)
- `Additional Redirect URLs`: include `http://localhost:3000`, `http://localhost:3000/login`, `http://localhost:3000/register`, `http://localhost:3000/dashboard`, and your production routes if needed.

## 4. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Auth + security notes

- Login: `supabase.auth.signInWithPassword`
- Signup: `supabase.auth.signUp`
- Protected routes are enforced in `middleware.ts`
- All event CRUD is user-scoped in Postgres with RLS
- No service role key is used in the frontend

## Protected routes

- `/dashboard`
- `/events`
- `/events/[id]`
- `/create-event`
- `/recommendations`

Unauthenticated users are redirected to `/login`.
