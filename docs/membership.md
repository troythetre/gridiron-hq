# Gridiron Plus membership

Start/Sit, Trade Calculator, and Team Review check the signed-in user's subscription on the server. Subscription rows are written only by the Stripe webhook using the Supabase service-role key; browser clients can read only their own row.

## Stripe setup

1. Create a recurring price in Stripe and copy its Price ID.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the app environment. `NEXT_PUBLIC_SUPABASE_URL` must also be set.
3. Add a Stripe webhook endpoint at `https://YOUR_APP_HOST/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
4. Apply `supabase/migrations/202610070005_memberships.sql` after the base profile schema and prior migrations.

The webhook verifies Stripe's timestamped signature before writing. Checkout creates a Stripe subscription session and places the authenticated profile ID in both session and subscription metadata. Access is granted only for active or trialing subscriptions.

## News images and Fantasy Feed

Apply `supabase/migrations/202610070004_news_images.sql` to store publisher-provided RSS image URLs. The importer reads media thumbnail/content, enclosure, and excerpt image references and links those images from their publisher; it does not copy the files. Apply `202610070002_community_and_fantasy_feed.sql` and configure the YouTube refresh secrets as described in [social-and-video.md](social-and-video.md) for video cards.
