import { createClient } from "@/lib/supabase/server";

export type Membership = { status: string; current_period_end: string | null };

export async function getMembership(userId: string): Promise<Membership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_subscriptions")
    .select("status,current_period_end")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function hasActiveMembership(userId: string) {
  const membership = await getMembership(userId);
  return !!membership && ["active", "trialing"].includes(membership.status)
    && (!membership.current_period_end || new Date(membership.current_period_end).getTime() > Date.now());
}
