# Gridiron HQ memberships

Gridiron Plus unlocks roster-aware Start/Sit, trade analysis, and Team Review. The sports betting tools are sold separately:

| Plan | Includes | Price |
| --- | --- | --- |
| Gridiron Plus | Fantasy roster tools | $4.99/month |
| Sunday Blitz | NFL parlay builder | $4.99/month |
| Saturday Surge | College football parlay builder | $4.99/month |

## Supabase setup

Run `supabase/migrations/202610070006_membership_products.sql` in the SQL Editor of the Supabase project used by the app. It creates `membership_subscriptions` if missing, preserves existing Gridiron Plus subscription rows, supports a separate subscription per plan, applies row-level security, and reloads the PostgREST schema cache. The existing `public.profiles` table must already exist.

## Stripe setup

1. In Stripe, create three recurring monthly products at $4.99/month: **Gridiron Plus**, **Sunday Blitz**, and **Saturday Surge**. Copy each product's recurring Price ID.
2. Configure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_NFL_BETTING_PRICE_ID`, `STRIPE_CFB_BETTING_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` (the canonical HTTPS app origin), `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_URL` in the app environment. Use Stripe test-mode credentials and test prices during development.
3. Add a Stripe webhook endpoint at `https://YOUR_APP_HOST/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Enable the Stripe Billing customer portal so subscribers can manage billing and cancel subscriptions.

Checkout attaches the authenticated profile ID and plan key to the Stripe subscription. Access is granted only after the signed webhook records an active or trialing subscription for that plan. Stripe webhook failures are returned so Stripe can retry. Each plan uses its own subscription record; billing portal sessions use the shared Stripe customer.

To smoke test, use Stripe test mode, complete checkout for each plan, verify the signed webhook event succeeded, confirm only the purchased tool is unlocked, use Manage billing, and cancel the test subscription. Confirm access is removed when Stripe sends the cancellation/update event.
