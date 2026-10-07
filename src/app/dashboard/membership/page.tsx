import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  getMemberships,
  hasMembershipAccess,
  hasOwnerAccess,
  MembershipSchemaNotReadyError,
  type Membership,
} from "@/lib/membership";
import { MEMBERSHIP_PLANS, type MembershipProductKey } from "@/lib/membership-plans";
import { openMembershipPortal, startMembershipCheckout } from "@/app/actions/membership";

const planOrder: MembershipProductKey[] = ["gridiron_plus", "nfl_betting", "cfb_betting"];

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let memberships: Membership[] = [];
  let schemaReady = true;
  try {
    memberships = await getMemberships(user.id);
  } catch (error) {
    if (error instanceof MembershipSchemaNotReadyError) {
      schemaReady = false;
    } else {
      throw error;
    }
  }

  const ownerAccess = hasOwnerAccess(user.email);
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="relative isolate min-h-60 overflow-hidden rounded-3xl border border-red-400/25 bg-[#22080c]">
      <Image src="/membership-hero.webp" alt="" fill priority className="object-contain object-right" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,8,10,.97)_0%,rgba(29,8,13,.86)_56%,rgba(18,9,13,.25)_100%),linear-gradient(0deg,rgba(9,9,12,.55),transparent)]" />
      <div className="relative z-10 flex min-h-60 flex-col justify-center p-7 sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-red-200">Memberships</p>
        <h1 className="mt-2 font-display text-4xl font-black text-white">Pick your edge.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Choose fantasy tools, NFL betting tools, or college football betting tools. Each plan is separate and can be managed through Stripe.</p>
      </div>
    </header>
    {params.success && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">Checkout complete. Access will unlock when Stripe confirms your subscription.</p>}
    {params.cancelled && <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">Checkout was cancelled. You can come back any time.</p>}
    {!schemaReady && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
      <p className="font-bold">Membership setup is incomplete: Supabase is missing the membership table.</p>
      <p className="mt-1">In the Supabase project matching this app&apos;s URL, open SQL Editor and run <code>supabase/migrations/202610070006_membership_products.sql</code>. This creates the missing table and enables separate plan subscriptions.</p>
    </div>}
    {params.error === "setup" && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">This plan isn&apos;t configured yet. Add its Stripe recurring Price ID and the shared Stripe and Supabase server settings.</p>}
    {params.error === "checkout" && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">Stripe couldn&apos;t start checkout. Please try again; if the problem continues, contact support.</p>}
    {params.error === "portal" && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">Stripe couldn&apos;t open billing management. Please try again.</p>}
    {params.error === "portal-unavailable" && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">No Stripe billing account is linked to this profile yet. Start membership or contact support.</p>}
    {params.error === "already-active" && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">This plan is already active. Use Manage billing to update it.</p>}
    {params.error === "plan" && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">That membership plan is not recognized.</p>}

    <div className="grid gap-4 lg:grid-cols-3">
      {planOrder.map((productKey) => {
        const plan = MEMBERSHIP_PLANS[productKey];
        const membership = memberships.find((row) => row.product_key === productKey);
        const active = schemaReady && hasMembershipAccess(membership, user.email);
        const localPreview = active && !membership && process.env.NODE_ENV !== "production" && !process.env.STRIPE_SECRET_KEY;
        const priceConfigured = !!process.env[plan.priceEnv];
        const status = ownerAccess
          ? "Owner access · unlocked"
          : localPreview
            ? "Local development preview · billing not connected"
          : membership && active
            ? `Active · ${membership.status}${membership.current_period_end ? ` · renews/ends ${new Date(membership.current_period_end).toLocaleDateString()}` : ""}`
            : membership
              ? `Subscription status: ${membership.status}`
              : "No active subscription";
        return <section key={productKey} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface">
          {productKey === "gridiron_plus" ? <div className="relative h-36">
            <Image src="/gridiron-plus.jpg" alt="" fill className="object-cover object-[center_35%]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,20,.9),rgba(8,13,20,.18)),linear-gradient(0deg,rgba(8,13,20,.52),transparent)]" />
            <p className="absolute bottom-4 left-5 text-xs font-black uppercase tracking-widest text-sky-200">Fantasy tools</p>
          </div> : productKey === "nfl_betting" ? <div className="relative h-36">
            <Image src="/sunday-blitz.jpeg" alt="" fill className="object-cover object-[center_35%]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,20,.86),rgba(8,13,20,.16)),linear-gradient(0deg,rgba(8,13,20,.52),transparent)]" />
            <p className="absolute bottom-4 left-5 text-xs font-black uppercase tracking-widest text-amber-200">NFL betting</p>
          </div> : <div className="relative h-36">
            <Image src="/saturday-surge.jpeg" alt="" fill className="object-cover object-[center_35%]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,20,.88),rgba(8,13,20,.2)),linear-gradient(0deg,rgba(8,13,20,.54),transparent)]" />
            <p className="absolute bottom-4 left-5 text-xs font-black uppercase tracking-widest text-amber-200">CFB betting</p>
          </div>}
          <div className="flex flex-1 flex-col p-6">
            <h2 className="text-2xl font-black">{plan.name}</h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-muted">{plan.description}</p>
            <p className="mt-5 text-xl font-black">{plan.priceLabel}</p>
            <p className="mt-3 text-xs text-muted">{status}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              {active && membership && !ownerAccess
                ? <form action={openMembershipPortal.bind(null, productKey)}>
                  <button className="rounded-full border border-border px-5 py-2.5 text-sm font-bold transition hover:bg-background">Manage billing</button>
                </form>
                : !active && <form action={startMembershipCheckout.bind(null, productKey)}>
                  <button disabled={!schemaReady || !priceConfigured} className="rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                    {priceConfigured ? "Subscribe" : "Coming after Stripe setup"}
                  </button>
                </form>}
            </div>
            {!priceConfigured && <p className="mt-3 text-xs text-muted">Configure {plan.priceEnv} to enable this plan.</p>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
