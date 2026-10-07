# Community and Fantasy Feed setup

Apply `supabase/migrations/202610070002_community_and_fantasy_feed.sql` after the news-feed migration. It creates the anonymous forum, follow graph, private-message table, and video table with row-level security.

Forum posts/replies are anonymous to other managers: the public rows contain no author ID. A private ownership table lets the app retain account-level control without exposing the author through normal queries. The Huddle is only visible to signed-in users. DMs are private to the two participants and require mutual follows.

## Fantasy video refresh

The scheduled **Refresh fantasy video feed** GitHub Action searches recent NFL fantasy videos and stores links, thumbnails, titles, and tags. To enable it:

1. Enable YouTube Data API v3 for a Google Cloud project and create an API key restricted to that API.
2. Add `YOUTUBE_API_KEY` as a GitHub Actions repository secret. The workflow also reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Run **Refresh fantasy video feed** once with the **Run workflow** button. It refreshes hourly and removes videos older than 45 days.

The API key and Supabase service-role key must stay in GitHub Secrets; neither belongs in a `NEXT_PUBLIC_` variable.
