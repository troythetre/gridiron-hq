# Deploying Gridiron HQ to Cloudflare Workers

The `gridiron-hq` Worker was serving Cloudflare's starter response because the repository did not include a Next.js Worker adapter. This repository now uses Cloudflare's vinext setup. The normal `npm run dev` / `npm run build` scripts remain available for Next.js; `*:vinext` scripts target Workers.

## Connect the existing Worker to GitHub

In Cloudflare, open **Workers & Pages → gridiron-hq → Settings → Builds** and connect `troythetre/gridiron-hq` if it is not already connected. Set `main` as the production branch, then set:

- Build command: `npm run build:vinext`
- Deploy command: `npm run deploy:vinext:built`

The deploy command skips rebuilding because Workers Builds has already run the build command. For a one-off local deploy instead, use `npm run deploy:vinext` after logging into Cloudflare.

After changing these settings, trigger a fresh build with a push that changes a tracked file included by **Build watch paths**. An empty commit may not trigger a build because it changes no files. In the build log, confirm that it runs `npm run build:vinext` followed by `npm run deploy:vinext:built`.

The Worker name in `cloudflare.config.ts` must stay `gridiron-hq` so deployments update the existing `gridiron-hq.yw2888.workers.dev` URL.

## Configure app environment

Add these names under both **Build variables and secrets** (so Vite can inline the public Supabase values during build) and **Worker Settings → Variables and Secrets** (so server requests can read them at runtime):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The anon key is designed for browser use; database access still depends on Supabase RLS. If using ESPN private-league sync, also add `ESPN_COOKIE_ENCRYPTION_KEY` as a secret. Never add values to this repository. Then check **Deployments** for the build status and open the Worker URL after it succeeds.

The Cloudflare compatibility report passed for 97% of detected Next.js features. The existing custom Turbopack loader rule is ignored under Vite; Tailwind is configured with its Vite plugin instead. vinext is currently beta, so verify auth, server actions, and page routes on the deployed Worker.
