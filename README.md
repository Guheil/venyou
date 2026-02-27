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
# Optional: Mapbox for location pinning and map previews
NEXT_PUBLIC_MAPBOX_TOKEN=...
# Optional: external AI insights for recommendations
GROQ_API_KEY=...
# Optional override (default: llama-3.1-8b-instant)
GROQ_MODEL=llama-3.1-8b-instant
# Optional comma-separated fallback list
GROQ_FALLBACK_MODELS=
```

## 3. Create database schema (one-time)

In Supabase SQL Editor, run the SQL from [`supabase/schema.sql`](./supabase/schema.sql).

This creates:
- `public.events` table
- `public.venues` table (seed venue catalog)
- `public.recommend_venues_for_event(...)` RPC function for AI-style fit ranking
- indexes for fast per-user queries
- row-level security (RLS) policies so users only access their own rows

The app also includes:
- `POST /api/recommendations/insights` for Groq-powered personalized AI venue notes
- `POST /api/support/chat` for authenticated Groq-powered chat support

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
- `/support`
- `/venue/[id]`

Unauthenticated users are redirected to `/login`.
