# ESPN Fantasy sync setup

ESPN Fantasy sync is read-only and currently targets private leagues. ESPN does not provide a supported public fantasy API; this integration uses an unofficial read endpoint that ESPN may change.

## Required setup

1. Apply `supabase/migrations/202610070003_espn_sync.sql` to the Supabase project.
2. Add `ESPN_COOKIE_ENCRYPTION_KEY` to the server environment. Generate a 32-byte key with `openssl rand -hex 32`. Set the same value in local development and the hosting provider's server environment. Do not prefix it with `NEXT_PUBLIC_` or commit it.
3. On the Sync page, enter the ESPN league ID and season plus the `SWID` and `espn_s2` cookies from a logged-in ESPN browser session. ESPN cookies are account session credentials; treat them like passwords.

The server encrypts both cookies with AES-256-GCM before storing them. Only the encrypted values are stored in Supabase, under owner-only row-level security. Re-sync decrypts them server-side. Disconnecting a league deletes its encrypted credentials and cached roster. The imported roster is reference-only; Gridiron HQ never writes lineup or roster changes to ESPN.

If the signed-in account cannot be matched to a league team, the form accepts an ESPN team ID as a fallback.
