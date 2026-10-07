import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isMembershipProductKey } from "@/lib/membership-plans";

export const runtime = "nodejs";

type StripeSubscription = {
  id: string;
  metadata?: Record<string, string> | null;
  customer?: string | { id?: string } | null;
  status?: string | null;
  current_period_end?: number | null;
};

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

function isStripeSubscription(value: unknown): value is StripeSubscription {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).id === "string";
}

function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const fields = signature.split(",").map((part) => part.split("="));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return signatures.some((value) => {
    if (!/^[a-f\d]{64}$/i.test(value)) return false;
    return timingSafeEqual(expected, Buffer.from(value, "hex"));
  });
}

async function stripeSubscription(subscriptionId: string): Promise<StripeSubscription> {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!response.ok) throw new Error(`Stripe subscription lookup failed (${response.status})`);
  const result: unknown = await response.json();
  if (!isStripeSubscription(result)) throw new Error("Stripe returned an invalid subscription response");
  return result;
}

async function saveSubscription(subscription: StripeSubscription) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase service role is not configured");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const subscriptionId = subscription.id;
  let profileId = subscription.metadata?.profile_id;
  const metadataProductKey = subscription.metadata?.product_key;
  let productKey = metadataProductKey;
  if (!profileId) {
    const { data } = await admin.from("membership_subscriptions").select("profile_id,product_key").eq("stripe_subscription_id", subscriptionId).maybeSingle();
    profileId = data?.profile_id;
    productKey ??= data?.product_key;
  }
  if (!profileId) throw new Error("Stripe subscription has no matching profile_id metadata");
  productKey ??= "gridiron_plus";
  if (!isMembershipProductKey(productKey)) throw new Error("Stripe subscription has an unknown product_key");
  const { error } = await admin.from("membership_subscriptions").upsert({
    profile_id: profileId,
    product_key: productKey,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    stripe_subscription_id: subscriptionId,
    status: subscription.status ?? "incomplete",
    current_period_end: subscription.current_period_end ? new Date(Number(subscription.current_period_end) * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "profile_id,product_key" });
  if (error) throw error;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!secret || !signature || !verifyStripeSignature(rawBody, signature, secret)) {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  try {
    if (event.type === "checkout.session.completed") {
      const subscriptionId = event.data.object.subscription;
      if (typeof subscriptionId === "string") await saveSubscription(await stripeSubscription(subscriptionId));
    } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      if (!isStripeSubscription(event.data.object)) throw new Error("Stripe event does not contain a valid subscription");
      await saveSubscription(event.data.object);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
