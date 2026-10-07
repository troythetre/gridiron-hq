# Gridiron HQ

Gridiron HQ is a fantasy-football platform built with Next.js 16, React 19, and
Supabase. The web app runs locally; authentication and database requests use the
Supabase project configured for the app.

## Run the platform locally

### Requirements

- Node.js compatible with Next.js 16
- npm
- A Supabase project with access to its URL and public anon/publishable key

### Configure Supabase

1. Create a Supabase project, or use a development project you can safely modify.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql)
   to create the app tables, row-level security policies, and signup trigger.
3. In Supabase Authentication URL Configuration, set the site URL to
   `http://localhost:3000` and allow that URL for redirects.
4. Create `.env.local` in the repository root:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
   ```

   These are public client credentials; never put a Supabase service-role key in
   a `NEXT_PUBLIC_` variable or commit real credentials.

5. The app reads rankings, injuries, waiver picks, and news from Supabase. The
   sample JSON in [`src/data/`](./src/data/) is not loaded automatically. To
   exercise those pages and roster editing, import the sample records into the
   matching `players`, `injuries`, `waiver_picks`, and `news_items` tables. Use
   the Supabase Table Editor's CSV import (convert the JSON records to CSV if
   needed) or insert equivalent rows. Omit generated `id` values when loading
   records.

> This repository does not currently include Supabase CLI configuration,
> migrations, or a seed command. With the setup above, Next.js runs on your
> machine but Supabase Auth/Postgres are provided by the configured Supabase
> project; an entirely offline/local backend is not configured yet.

### Install and start

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test the main user flows

There is currently no automated test script or test suite in `package.json`.
Use the following manual smoke test after configuring the database and sample
records:

1. Open `/` and verify the public landing page loads.
2. Sign up at `/signup`, then sign in at `/login`. If email confirmation is
   enabled in Supabase, confirm the email before logging in.
3. Visit `/dashboard` while signed in. Verify rankings, injuries, waiver picks,
   news, and start/sit pages load their Supabase-backed data.
4. Sign out and visit `/dashboard` directly; verify the app redirects to login.
5. Create a league, add or join a second account using its invite code, and
   verify both teams appear.
6. Add and remove roster players; verify that only eligible positions can fill
   each roster slot.

Run the available static checks and production build:

```bash
npm run lint
npm run build
npm start
```

After `npm start`, open `http://localhost:3000` to smoke-test the production
build. The local app needs the same Supabase environment variables in each
mode.

## Technical documentation

- This README contains local setup, platform smoke tests, and available
  validation commands.
- [`AGENTS.md`](./AGENTS.md) contains repository-specific development guidance.
- [`supabase/schema.sql`](./supabase/schema.sql) documents the database schema,
  row-level security policies, and signup trigger.
- Implementation-specific comments live beside the relevant code, including
  the scoring rationale in [`src/lib/scoring.ts`](./src/lib/scoring.ts) and
  Supabase session handling in [`src/lib/supabase/`](./src/lib/supabase/).
