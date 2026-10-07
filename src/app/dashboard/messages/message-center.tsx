"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { sendDirectMessage } from "@/app/actions/community";
import { Input } from "@/components/ui/input";

type Contact = { id: string; display_name: string };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

export function MessageCenter({ setupReady, currentUserId, contacts, messages, selectedRecipientId }: {
  setupReady: boolean; currentUserId: string; contacts: Contact[]; messages: Message[]; selectedRecipientId: string | null;
}) {
  const [query, setQuery] = useState("");
  const selected = contacts.find((contact) => contact.id === selectedRecipientId) ?? null;
  const filteredContacts = useMemo(() => contacts.filter((contact) => contact.display_name.toLowerCase().includes(query.toLowerCase())), [contacts, query]);
  const thread = selected ? messages.filter((message) => message.sender_id === selected.id || message.recipient_id === selected.id) : [];

  return <div className="mx-auto max-w-6xl space-y-5">
    <header><p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted">Private · mutual follows</p><h1 className="mt-1 font-display text-4xl font-black">Messages</h1>{!setupReady && <p className="mt-2 text-sm text-muted">Apply the community migration to enable follows and private messages.</p>}</header>
    <div className="grid min-h-[620px] overflow-hidden rounded-3xl border border-border bg-surface md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className={`border-b border-border p-4 md:border-b-0 md:border-r ${selected ? "hidden md:block" : ""}`}>
        <label className="block"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mutual follows" className="rounded-full bg-background" /></label>
        <div className="mt-3 divide-y divide-border">
          {filteredContacts.map((contact) => <Link key={contact.id} href={`/dashboard/messages?to=${contact.id}`} className={`flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-white/[.05] ${contact.id === selectedRecipientId ? "bg-white/[.06]" : ""}`}>
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[.05] text-sm font-bold">{contact.display_name.slice(0, 1).toUpperCase()}</span><span className="truncate text-sm font-semibold">{contact.display_name}</span>
          </Link>)}
          {filteredContacts.length === 0 && <div className="py-8 text-center text-xs leading-5 text-muted">DMs open after you and another manager follow each other.<br /><Link href="/dashboard/community" className="mt-2 inline-block font-bold text-white underline">Find managers</Link></div>}
        </div>
      </aside>

      {selected ? <section className="flex min-h-[620px] flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5"><Link href="/dashboard/messages" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 md:hidden" aria-label="Back to inbox"><ArrowLeft className="h-4 w-4" /></Link><span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.05] font-bold">{selected.display_name.slice(0, 1).toUpperCase()}</span><div><p className="text-sm font-bold">{selected.display_name}</p><p className="text-[10px] text-muted">Mutual follow</p></div></header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {thread.map((message) => <div key={message.id} className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_id === currentUserId ? "rounded-br-sm bg-white text-black" : "rounded-bl-sm border border-white/10 bg-background text-white"}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><time className={`mt-1 block text-right text-[9px] ${message.sender_id === currentUserId ? "text-black/55" : "text-muted"}`} dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time></div></div>)}
          {thread.length === 0 && <div className="grid h-full min-h-64 place-content-center text-center"><MessageCircle className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 text-sm font-semibold">Start a private conversation</p><p className="mt-1 text-xs text-muted">Only you and {selected.display_name} can read these messages.</p></div>}
        </div>
        <form action={sendDirectMessage.bind(null, selected.id)} className="flex items-center gap-2 border-t border-border p-3 sm:p-4">
          <Input name="body" required maxLength={4000} placeholder={`Message ${selected.display_name}…`} className="h-12 rounded-full bg-background" />
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-black hover:bg-white/85" aria-label="Send direct message"><Send className="h-4 w-4" /></button>
        </form>
      </section> : <section className="hidden place-content-center p-8 text-center md:grid"><MessageCircle className="mx-auto h-10 w-10 text-muted" /><p className="mt-3 font-semibold">Your private inbox</p><p className="mt-1 text-sm text-muted">Choose a mutual follow to open a conversation.</p></section>}
    </div>
  </div>;
}
