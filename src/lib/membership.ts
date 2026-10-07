import { createClient } from "@/lib/supabase/server";
import type { MembershipProductKey } from "@/lib/membership-plans";

export type Membership = {
  product_key: MembershipProductKey;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

export class MembershipSchemaNotReadyError extends Error {
  constructor() {
    super("The membership database migration has not been applied.");
    this.name = "MembershipSchemaNotReadyError";
  }
}

const OWNER_EMAIL = "troythetre@gmail.com";

export function hasOwnerAccess(email?: string | null) {
  return email?.trim().toLowerCase() === OWNER_EMAIL;
}

export function hasMembershipAccess(membership: Membership | undefined, email?: string | null) {
  if (hasOwnerAccess(email)) return true;
  if (process.env.NODE_ENV !== "production" && !process.env.STRIPE_SECRET_KEY) return true;
  return !!membership && ["active", "trialing"].includes(membership.status)
    && (!membership.current_period_end || new Date(membership.current_period_end).getTime() > Date.now());
}

export async function getMemberships(userId: string): Promise<Membership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_subscriptions")
    .select("product_key,status,current_period_end,stripe_customer_id")
    .eq("profile_id", userId);
  if (error?.code === "PGRST205" || error?.code === "42P01") {
    throw new MembershipSchemaNotReadyError();
  }
  if (error) throw error;
  return data;
}

export async function hasActiveMembership(
  userId: string,
  email?: string | null,
  productKey: MembershipProductKey = "gridiron_plus",
) {
  if (hasOwnerAccess(email)) return true;
  // Keep premium routes reviewable in local development before Stripe is configured.
  if (process.env.NODE_ENV !== "production" && !process.env.STRIPE_SECRET_KEY) return true;
  try {
    const memberships = await getMemberships(userId);
    return hasMembershipAccess(memberships.find((membership) => membership.product_key === productKey), email);
  } catch (error) {
    if (error instanceof MembershipSchemaNotReadyError) {
      console.error("Membership access is disabled until the membership database migration is applied.");
      return false;
    }
    throw error;
  }
}
