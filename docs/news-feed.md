# Fantasy news feed

Gridiron HQ ingests RSS headlines from ESPN NFL and FantasyPros every hour through GitHub Actions. The importer keeps the title, a short RSS excerpt, publication date, publisher, article URL, and keyword tags. It does not scrape full article pages. ESPN's RSS guidance requires that feed content be attributed and linked to its full article; the News feed does both.

Stories are tagged by team names, player names from the local player catalog, and fantasy terms including PPR, half-PPR, dynasty, waiver wire, start/sit, redraft, and target share. Practice and injury tags also feed the Player Market, where new reports can move a player's index when the next scheduled fetch arrives.

## Enable scheduled ingestion

1. Apply `supabase/migrations/202610070001_news_feed.sql` to the Supabase project. This adds article/source URLs, topic tags, and the unique URL index used for safe repeat upserts.
2. In the GitHub repository settings, add these Actions repository secrets:
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the service role key. Keep this only in GitHub Secrets; never expose it as a `NEXT_PUBLIC_` variable.
3. Run the **Refresh fantasy news** workflow once using its **Run workflow** button. Afterward, GitHub Actions runs it hourly.

The importer can also be run locally with `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run news:fetch`. It is idempotent by article URL. If one publisher feed is temporarily unavailable, the other source can still be ingested; failures are printed in the workflow log.
