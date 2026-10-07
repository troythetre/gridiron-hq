# Gridiron Plus membership

Start/Sit, Trade Calculator, and Team Review check the signed-in user's subscription on the server. Subscription rows are written only by the Stripe webhook using the Supabase service-role key; browser clients can read only their own row.

## Stripe setup

1. In Stripe, create a recurring product/price for the single Gridiron Plus plan and copy the Price ID. Configure the amount, currency, and billing interval in Stripe; the app does not hard-code or collect card details.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` (the canonical HTTPS app origin), `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_URL` in the app environment. Use Stripe test-mode credentials and a test price for development.
3. Apply `supabase/migrations/202610070005_memberships.sql` after the base profile schema and prior migrations.
4. Add a Stripe webhook endpoint at `https://YOUR_APP_HOST/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Enable the Stripe Billing customer portal in Stripe so members can update payment details, see invoices, and cancel or change their subscription. The Membership page links active members to this portal.

Checkout creates a Stripe subscription session only for the authenticated user and places their profile ID in both session and subscription metadata. Stripe redirects back to the Membership page after checkout; access is granted only after the signed webhook records an active or trialing subscription. Webhook signature timestamps are checked, and database/API failures return an error so Stripe can retry delivery. The customer portal uses the Stripe customer ID saved by that webhook.

To smoke test end to end, use Stripe test mode, complete checkout with a Stripe test card, verify the signed webhook event succeeded in Stripe, confirm the Membership page shows active access, open Manage billing, and cancel the test subscription. Confirm access is removed when Stripe sends the cancellation/update event.

## News images and Fantasy Feed

Apply `supabase/migrations/202610070004_news_images.sql` to store publisher-provided RSS image URLs. The importer reads media thumbnail/content, enclosure, and excerpt image references and links those images from their publisher; it does not copy the files. Apply `202610070002_community_and_fantasy_feed.sql` and configure the YouTube refresh secrets as described in [social-and-video.md](social-and-video.md) for video cards.
