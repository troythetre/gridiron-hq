import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * A plain, cookie-less Supabase client for tables that are genuinely
 * public read data - no auth required. Verified directly against the
 * database (pg_policies): players, injuries, and news_items all have a
 * `roles: {public}, qual: true` SELECT policy, so reading them doesn't
 * need the logged-in user's session at all.
 *
 * src/lib/supabase/server.ts's client calls cookies() from next/headers
 * to attach the user's session - necessary for anything RLS-gated to a
 * specific user (parlays, favorites, league data), but it also means
 * Next treats every request that uses it as fully dynamic and won't
 * cache fetches made through it. That client is wrapped around reads
 * that don't need a session at all, which is why every tab switch on
 * /dashboard/player-analysis re-ran getPlayers()/getInjuries()/getNews()
 * against Supabase from scratch with no caching whatsoever. This client
 * has no such restriction, so the queries in src/lib/data.ts that use it
 * are safe to wrap in unstable_cache.
 */
let client: ReturnType<typeof createSupabaseClient> | null = null;

export function getPublicSupabaseClient() {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
