"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, AtSign, Feather, MessageCircle, Search, Send, Users, UserRoundPlus } from "lucide-react";
import { createAnonymousForumPost, createAnonymousForumReply, toggleFollow } from "@/app/actions/community";
import { Input } from "@/components/ui/input";

type Post = { id: string; body: string; created_at: string };
type Reply = { id: string; post_id: string; body: string; created_at: string };
type Person = { id: string; display_name: string };

function timeAgo(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export function CommunityHub({
  setupReady, posts, replies, people, followingIds, followerIds,
}: {
  setupReady: boolean; posts: Post[]; replies: Reply[]; people: Person[]; followingIds: string[]; followerIds: string[];
}) {
  const [query, setQuery] = useState("");
  const filteredPeople = useMemo(() => people.filter((person) => person.display_name.toLowerCase().includes(query.trim().toLowerCase())), [people, query]);

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#181818,#090909_68%)] p-6 sm:p-9">
      <p className="text-[10px] font-bold uppercase tracking-[.24em] text-muted">Gridiron Social</p>
      <h1 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-6xl">The Huddle</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Talk ball, vent about your lineup, share a take. Forum posts are anonymous to other managers; following and private messages use your account profile.</p>
    </header>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
      <section className="space-y-4">
        {!setupReady && <div className="rounded-2xl border border-white/15 bg-white/[.04] p-4 text-sm leading-6 text-muted">Community storage isn&apos;t set up yet. Apply <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">supabase/migrations/202610070002_community_and_fantasy_feed.sql</code> to enable posting, following, and DMs.</div>}
        {setupReady && <form action={createAnonymousForumPost} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <label htmlFor="post-body" className="mb-3 flex items-center gap-2 text-sm font-bold"><Feather className="h-4 w-4 text-muted" />Drop a thought in the huddle</label>
          <textarea id="post-body" name="body" required minLength={1} maxLength={4000} rows={4} placeholder="Start a debate. Ask for advice. Celebrate the W. Your post will appear as Anonymous Manager." className="w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-muted/70 focus:border-white/30 focus:ring-2 focus:ring-white/10" />
          <div className="mt-3 flex flex-col justify-between gap-3 text-xs text-muted sm:flex-row sm:items-center"><span>Anonymous to other managers · up to 4,000 characters</span><button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-white/85"><Send className="h-3.5 w-3.5" />Post anonymously</button></div>
        </form>}

        {setupReady && posts.length ? posts.map((post) => {
          const postReplies = replies.filter((reply) => reply.post_id === post.id);
          return <article key={post.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[.06]"><AtSign className="h-4 w-4 text-muted" /></span><span className="text-sm font-semibold">Anonymous Manager</span></div><time className="text-xs text-muted" dateTime={post.created_at}>{timeAgo(post.created_at)}</time></div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-white/90">{post.body}</p>
            <details className="group mt-4 border-t border-border pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-muted hover:text-white"><MessageCircle className="h-4 w-4" />{postReplies.length} replies <span className="ml-auto text-[10px] uppercase tracking-wider group-open:hidden">Open thread</span></summary>
              <div className="mt-4 space-y-3">
                {postReplies.map((reply) => <div key={reply.id} className="rounded-xl bg-background/80 p-3"><div className="mb-1 flex items-center justify-between text-[10px] text-muted"><span>Anonymous Manager</span><time dateTime={reply.created_at}>{timeAgo(reply.created_at)}</time></div><p className="whitespace-pre-wrap break-words text-sm leading-6">{reply.body}</p></div>)}
                <form action={createAnonymousForumReply.bind(null, post.id)} className="flex items-center gap-2">
                  <Input name="body" required maxLength={2000} placeholder="Reply anonymously…" className="h-11 rounded-full bg-background" />
                  <button aria-label="Send anonymous reply" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white text-black hover:bg-white/85"><Send className="h-4 w-4" /></button>
                </form>
              </div>
            </details>
          </article>;
        }) : <div className="rounded-2xl border border-dashed border-border py-16 text-center"><MessageCircle className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 font-semibold">The huddle is quiet</p><p className="mt-1 text-sm text-muted">Be the first manager to start a conversation.</p></div>}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-8">
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted">Connect</p><h2 className="mt-1 font-display text-2xl font-bold">Manager directory</h2></div><Users className="h-5 w-5 text-muted" /></div>
          <label className="relative mt-4 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a manager" className="rounded-full bg-background pl-10" /></label>
          <div className="mt-3 max-h-[520px] divide-y divide-border overflow-y-auto">
            {filteredPeople.map((person) => {
              const follows = followingIds.includes(person.id);
              const followsYou = followerIds.includes(person.id);
              const mutual = follows && followsYou;
              return <div key={person.id} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.05] text-xs font-bold">{person.display_name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.display_name}</span><span className="block text-[10px] text-muted">{mutual ? "Mutual follow · DMs open" : followsYou ? "Follows you" : "Gridiron manager"}</span></span>
                {setupReady && (mutual ? <Link href={`/dashboard/messages?to=${person.id}`} aria-label={`Message ${person.display_name}`} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:bg-white/10"><MessageCircle className="h-4 w-4" /></Link> : <form action={toggleFollow}><input type="hidden" name="targetId" value={person.id} /><button aria-label={`${follows ? "Unfollow" : "Follow"} ${person.display_name}`} className={`grid h-9 w-9 place-items-center rounded-full border transition ${follows ? "border-white/25 bg-white text-black" : "border-white/10 hover:bg-white/10"}`}>{follows ? <span className="text-sm">✓</span> : <UserRoundPlus className="h-4 w-4" />}</button></form>)}
              </div>;
            })}
            {filteredPeople.length === 0 && <p className="py-8 text-center text-sm text-muted">No managers found.</p>}
          </div>
          <Link href="/dashboard/messages" className="mt-3 flex items-center justify-between rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/[.05]"><span>Open messages</span><ArrowUpRight className="h-4 w-4" /></Link>
        </section>
        <p className="rounded-xl border border-border/70 px-4 py-3 text-[10px] leading-5 text-muted">Forum posts and replies do not show account names. Your account is retained privately so you can follow people and use DMs.</p>
      </aside>
    </div>
  </div>;
}
