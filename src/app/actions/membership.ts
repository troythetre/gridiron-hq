"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startMembershipCheckout() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!secret || !price || !appUrl) redirect("/dashboard/membership?error=setup");

  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    success_url: `${appUrl}/dashboard/membership?success=1`,
    cancel_url: `${appUrl}/dashboard/membership?cancelled=1`,
    "subscription_data[metadata][profile_id]": user.id,
    "metadata[profile_id]": user.id,
  });
  if (user.email) form.set("customer_email", user.email);
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const session = await response.json() as { url?: string };
  if (!response.ok || !session.url) redirect("/dashboard/membership?error=checkout");
  redirect(session.url as string);
}
