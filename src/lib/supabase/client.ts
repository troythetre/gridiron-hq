import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    // Supabase URL and anon key are required for the client to function, and are provided via environment variables.
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
