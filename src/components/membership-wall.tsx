import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function MembershipWall({ feature }: { feature: string }) {
  return <section className="mx-auto max-w-3xl rounded-3xl border border-amber-400/20 bg-[linear-gradient(135deg,#211a10,#11100c)] p-8 text-center sm:p-12">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300"><LockKeyhole className="h-6 w-6" /></span>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Gridiron Plus</p>
    <h1 className="mt-2 font-display text-3xl font-black">{feature} is a member tool</h1>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">Get roster-aware lineup advice, trade analysis, and team reviews with a Gridiron Plus membership.</p>
    <Link href="/dashboard/membership" className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-[#171109] transition hover:bg-amber-300">View membership</Link>
  </section>;
}
