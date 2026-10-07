import { createClient } from "@/lib/supabase/server";
import { getMembership, hasActiveMembership, hasOwnerAccess } from "@/lib/membership";
import { startMembershipCheckout } from "@/app/actions/membership";

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ success?: string; cancelled?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const membership = await getMembership(user.id);
  const ownerAccess = hasOwnerAccess(user.email);
  const active = await hasActiveMembership(user.id, user.email);
  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="rounded-3xl border border-amber-400/20 bg-[linear-gradient(135deg,#342817,#12100c_75%)] p-7 sm:p-10">
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Gridiron Plus</p>
      <h1 className="mt-2 font-display text-4xl font-black">Your fantasy edge, personalized.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-50/65">Unlock Start/Sit, roster-aware trade analysis, and Team Review. Subscription access is managed securely through Stripe.</p>
    </header>
    {params.success && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">Checkout complete. Your membership will unlock when Stripe confirms the subscription.</p>}
    {params.cancelled && <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">Checkout was cancelled. You can come back any time.</p>}
    {params.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">Membership checkout is not configured yet. Set the Stripe and app URL environment variables, then try again.</p>}
    <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Member access</p><h2 className="mt-2 text-2xl font-black">{active ? "You’re a member" : "Unlock the full toolkit"}</h2><p className="mt-2 text-sm text-muted">{ownerAccess ? "Owner access · all member tools unlocked" : membership && active ? `Status: ${membership.status}${membership.current_period_end ? ` · renews ${new Date(membership.current_period_end).toLocaleDateString()}` : ""}` : active ? "Membership access is active." : "One subscription unlocks all three roster-powered tools."}</p></div>
        {!active && <form action={startMembershipCheckout}><button className="rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90">Start membership</button></form>}
      </div>
      <div className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">{["Roster-aware Start/Sit", "Team-by-team trade calculator", "ESPN and Sleeper Team Review"].map((item) => <div key={item} className="rounded-xl border border-border bg-background/40 p-4 text-sm font-semibold">{item}</div>)}</div>
      {!process.env.STRIPE_PRICE_ID && <p className="mt-4 text-xs text-muted">Membership checkout is pending Stripe setup.</p>}
    </section>
  </div>;
}
