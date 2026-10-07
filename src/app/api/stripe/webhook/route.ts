import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

async function stripeSubscription(subscriptionId: string) {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!response.ok) throw new Error(`Stripe subscription lookup failed (${response.status})`);
  return response.json();
}

async function saveSubscription(subscription: Record<string, any>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase service role is not configured");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const subscriptionId = String(subscription.id);
  let profileId = subscription.metadata?.profile_id as string | undefined;
  if (!profileId) {
    const { data } = await admin.from("membership_subscriptions").select("profile_id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
    profileId = data?.profile_id;
  }
  if (!profileId) throw new Error("Stripe subscription has no matching profile_id metadata");
  const { error } = await admin.from("membership_subscriptions").upsert({
    profile_id: profileId,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    stripe_subscription_id: subscriptionId,
    status: String(subscription.status ?? "incomplete"),
    current_period_end: subscription.current_period_end ? new Date(Number(subscription.current_period_end) * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "profile_id" });
  if (error) throw error;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!secret || !signature || !verifyStripeSignature(rawBody, signature, secret)) {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, any> } };
  try {
    if (event.type === "checkout.session.completed") {
      const subscriptionId = event.data.object.subscription;
      if (typeof subscriptionId === "string") await saveSubscription(await stripeSubscription(subscriptionId) as Record<string, any>);
    } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      await saveSubscription(event.data.object);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
