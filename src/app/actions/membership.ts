"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasOwnerAccess } from "@/lib/membership";

function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

async function createStripeSession(endpoint: string, secret: string, form: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const result = await response.json() as { url?: string; error?: { message?: string } };
  return { response, result };
}

export async function startMembershipCheckout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (hasOwnerAccess(user.email)) redirect("/dashboard/membership");

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const baseUrl = appUrl();
  if (!secret || !price || !baseUrl) redirect("/dashboard/membership?error=setup");

  const { data: membership, error: membershipError } = await supabase
    .from("membership_subscriptions")
    .select("status,current_period_end,stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (membership && ["active", "trialing"].includes(membership.status)
    && (!membership.current_period_end || new Date(membership.current_period_end).getTime() > Date.now())) {
    redirect("/dashboard/membership?error=already-active");
  }

  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    success_url: `${baseUrl}/dashboard/membership?success=1`,
    cancel_url: `${baseUrl}/dashboard/membership?cancelled=1`,
    "subscription_data[metadata][profile_id]": user.id,
    "metadata[profile_id]": user.id,
  });
  if (membership?.stripe_customer_id) form.set("customer", membership.stripe_customer_id);
  else if (user.email) form.set("customer_email", user.email);

  const { response, result } = await createStripeSession("checkout/sessions", secret, form);
  if (!response.ok || !result.url) {
    console.error("Stripe checkout session creation failed", response.status, result.error?.message);
    redirect("/dashboard/membership?error=checkout");
  }
  redirect(result.url);
}

export async function openMembershipPortal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secret = process.env.STRIPE_SECRET_KEY;
  const baseUrl = appUrl();
  if (!secret || !baseUrl) redirect("/dashboard/membership?error=setup");

  const { data: membership, error } = await supabase
    .from("membership_subscriptions")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!membership?.stripe_customer_id) redirect("/dashboard/membership?error=portal-unavailable");

  const { response, result } = await createStripeSession(
    "billing_portal/sessions",
    secret,
    new URLSearchParams({
      customer: membership.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/membership`,
    }),
  );
  if (!response.ok || !result.url) {
    console.error("Stripe billing portal session creation failed", response.status, result.error?.message);
    redirect("/dashboard/membership?error=portal");
  }
  redirect(result.url);
}
