"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Filter, MessageCircle, Search, Send, Users, UserRoundPlus, X } from "lucide-react";
import { sendDirectMessage } from "@/app/actions/community";
import { Input } from "@/components/ui/input";

type Contact = { id: string; display_name: string };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };
type DemoMessage = { id: string; threadId: string; senderId: string; senderName: string; body: string; createdAt: string };
type DemoContact = Contact & { unread: boolean; preview: string; time: string };

const DEMO_CONTACTS: DemoContact[] = [
  { id: "demo-jordan", display_name: "Jordan Lee", unread: true, preview: "That Ravens matchup is tempting this week.", time: "10:42 AM" },
  { id: "demo-casey", display_name: "Casey Morgan", unread: true, preview: "Would you move Gibbs for a top WR?", time: "9:18 AM" },
  { id: "demo-alex", display_name: "Alex Rivera", unread: false, preview: "Good luck this week!", time: "Yesterday" },
];

const DEMO_REQUESTS = [
  { id: "request-riley", name: "Riley Adams", team: "Sunday Scaries", note: "Wants to talk trade value for a running back." },
  { id: "request-sam", name: "Sam Patel", team: "Fourth & Long", note: "Sent you a message request after your waiver pickup." },
];

const DEMO_GROUPS = [
  { id: "group-waivers", name: "Waiver Wire Lab", members: 18, unread: true, preview: "Any must-adds before waivers clear?" },
  { id: "group-film", name: "Sunday Film Room", members: 9, unread: false, preview: "The slot matchup is the one to watch." },
];

const INITIAL_DEMO_MESSAGES: DemoMessage[] = [
  { id: "jordan-1", threadId: "demo-jordan", senderId: "demo-jordan", senderName: "Jordan Lee", body: "Who are you leaning toward at flex this week?", createdAt: "2026-10-07T14:20:00.000Z" },
  { id: "jordan-2", threadId: "demo-jordan", senderId: "demo-me", senderName: "You", body: "Still deciding between the two matchups.", createdAt: "2026-10-07T14:30:00.000Z" },
  { id: "jordan-3", threadId: "demo-jordan", senderId: "demo-jordan", senderName: "Jordan Lee", body: "That Ravens matchup is tempting this week.", createdAt: "2026-10-07T14:42:00.000Z" },
  { id: "casey-1", threadId: "demo-casey", senderId: "demo-casey", senderName: "Casey Morgan", body: "Would you move Gibbs for a top WR?", createdAt: "2026-10-07T13:18:00.000Z" },
  { id: "alex-1", threadId: "demo-alex", senderId: "demo-alex", senderName: "Alex Rivera", body: "Good luck this week!", createdAt: "2026-10-06T20:15:00.000Z" },
  { id: "group-waivers-1", threadId: "group-waivers", senderId: "group-member-1", senderName: "Taylor", body: "Any must-adds before waivers clear?", createdAt: "2026-10-07T13:55:00.000Z" },
  { id: "group-waivers-2", threadId: "group-waivers", senderId: "group-member-2", senderName: "Morgan", body: "I’m watching the backfield injury reports first.", createdAt: "2026-10-07T14:05:00.000Z" },
  { id: "group-film-1", threadId: "group-film", senderId: "group-member-3", senderName: "Jamie", body: "The slot matchup is the one to watch.", createdAt: "2026-10-06T19:15:00.000Z" },
];

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function MessageCenter({ setupReady, currentUserId, contacts, messages, selectedRecipientId }: {
  setupReady: boolean; currentUserId: string; contacts: Contact[]; messages: Message[]; selectedRecipientId: string | null;
}) {
  const [view, setView] = useState<"inbox" | "requests" | "groups">("inbox");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [acceptedRequestIds, setAcceptedRequestIds] = useState<string[]>([]);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);
  const [demoMessages, setDemoMessages] = useState(INITIAL_DEMO_MESSAGES);
  const [draft, setDraft] = useState("");

  const selectedContact = contacts.find((contact) => contact.id === selectedRecipientId) ?? null;
  const activeDemo = DEMO_CONTACTS.find((contact) => contact.id === activeDemoId)
    ?? DEMO_REQUESTS.filter((request) => acceptedRequestIds.includes(request.id)).map((request) => ({
      id: `demo-${request.id}`, display_name: request.name, unread: false, preview: "Conversation started", time: "New",
    })).find((contact) => contact.id === activeDemoId)
    ?? null;
  const activeGroup = DEMO_GROUPS.find((group) => group.id === activeGroupId) ?? null;
  const activeRequest = DEMO_REQUESTS.find((request) => request.id === activeRequestId) ?? null;

  const filteredContacts = useMemo(() => {
    const realContacts = contacts.filter((contact) => {
      const thread = messages.filter((message) => message.sender_id === contact.id || message.recipient_id === contact.id);
      const latest = thread.at(-1);
      const unread = Boolean(latest && latest.sender_id !== currentUserId && selectedRecipientId !== contact.id && !readIds.includes(contact.id));
      return contact.display_name.toLowerCase().includes(query.trim().toLowerCase()) && (!unreadOnly || unread);
    });
    const demoContacts = [
      ...DEMO_CONTACTS,
      ...DEMO_REQUESTS.filter((request) => acceptedRequestIds.includes(request.id)).map((request) => ({
        id: `demo-${request.id}`, display_name: request.name, unread: false, preview: "Conversation started", time: "New",
      })),
    ].filter((contact) => {
      const isUnread = contact.unread && !readIds.includes(contact.id);
      return contact.display_name.toLowerCase().includes(query.trim().toLowerCase()) && (!unreadOnly || isUnread);
    });
    return { realContacts, demoContacts };
  }, [contacts, messages, currentUserId, selectedRecipientId, readIds, query, unreadOnly, acceptedRequestIds]);

  const filteredGroups = DEMO_GROUPS.filter((group) =>
    group.name.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!unreadOnly || (group.unread && !readIds.includes(group.id)))
  );
  const filteredRequests = DEMO_REQUESTS.filter((request) =>
    !acceptedRequestIds.includes(request.id) && !dismissedRequestIds.includes(request.id) &&
    `${request.name} ${request.team}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const demoThreadId = activeDemo?.id ?? null;
  const selectedMessages: DemoMessage[] = useMemo(() => {
    const threadId = activeGroup?.id ?? demoThreadId;
    return threadId ? demoMessages.filter((message) => message.threadId === threadId) : [];
  }, [activeGroup, demoThreadId, demoMessages]);
  const liveThread = selectedContact
    ? messages.filter((message) => message.sender_id === selectedContact.id || message.recipient_id === selectedContact.id)
    : [];

  function openDemo(id: string) {
    setActiveDemoId(id);
    setActiveGroupId(null);
    setActiveRequestId(null);
    setReadIds((current) => current.includes(id) ? current : [...current, id]);
  }

  function openGroup(id: string) {
    setActiveGroupId(id);
    setActiveDemoId(null);
    setActiveRequestId(null);
    setReadIds((current) => current.includes(id) ? current : [...current, id]);
  }

  function submitDemoMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    const threadId = activeGroup?.id ?? demoThreadId;
    if (!body || !threadId) return;
    setDemoMessages((current) => [...current, {
      id: `demo-${Date.now()}`, threadId, senderId: "demo-me", senderName: "You", body, createdAt: new Date().toISOString(),
    }]);
    setDraft("");
  }

  function acceptRequest(id: string) {
    setAcceptedRequestIds((current) => [...current, id]);
    setView("inbox");
    openDemo(`demo-${id}`);
  }

  const hasSelection = Boolean(selectedContact || activeDemo || activeGroup || activeRequest);
  const unreadCount = DEMO_CONTACTS.filter((contact) => contact.unread && !readIds.includes(contact.id)).length
    + DEMO_GROUPS.filter((group) => group.unread && !readIds.includes(group.id)).length
    + filteredContacts.realContacts.length * 0;

  return <div className="mx-auto max-w-7xl space-y-5 text-blue-50">
    <header className="rounded-3xl border border-blue-400/15 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,.22),transparent_42%),linear-gradient(135deg,#0b2140,#071324_72%)] p-6 sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-blue-300">Private · mutual follows</p>
      <h1 className="mt-1 font-display text-4xl font-black sm:text-5xl">Messages</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/65">Keep league conversations, trade talk, and fantasy group chats in one place.</p>
    </header>

    <div className="rounded-xl border border-blue-300/10 bg-blue-500/[.06] px-4 py-3 text-xs leading-5 text-blue-100/70">
      {!setupReady
        ? <>Live messaging needs the community migration <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">202610070002</code>. The sample inbox below is interactive but demo-only.</>
        : <>Demo conversations, requests, and groups are examples only. Direct messages with mutual follows are live; requests and group chats are not connected to storage yet.</>}
    </div>

    <div className="grid min-h-[640px] overflow-hidden rounded-3xl border border-blue-400/20 bg-[#071426] md:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={`border-b border-blue-400/15 bg-[#091a30] p-3 md:border-b-0 md:border-r md:p-4 ${hasSelection ? "hidden md:block" : ""}`}>
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200/50" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "groups" ? "Search groups" : view === "requests" ? "Search requests" : "Search conversations"} className="rounded-full border-blue-300/15 bg-[#071426] pl-9 text-blue-50 placeholder:text-blue-100/35" />
        </label>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-blue-300/10 bg-[#071426] p-1">
          {([
            ["inbox", "Inbox", MessageCircle],
            ["requests", "Requests", UserRoundPlus],
            ["groups", "Groups", Users],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => { setView(id); setActiveRequestId(null); setActiveGroupId(null); setActiveDemoId(null); }} className={`relative flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-wide transition ${view === id ? "bg-blue-500 text-white shadow-lg shadow-blue-950/40" : "text-blue-100/55 hover:bg-blue-400/10 hover:text-white"}`}>
              <Icon className="h-4 w-4" />{label}
              {id === "requests" && filteredRequests.length > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] text-white">{filteredRequests.length}</span>}
            </button>
          ))}
        </div>

        {view !== "requests" && <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly((value) => !value)} className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition ${unreadOnly ? "border-blue-300/35 bg-blue-400/10 text-blue-100" : "border-blue-300/10 text-blue-100/55 hover:bg-blue-400/5"}`}>
          <span className="flex items-center gap-2"><Filter className="h-3.5 w-3.5" />Unread only</span>
          <span className="rounded-full bg-blue-300/10 px-2 py-0.5">{unreadCount}</span>
        </button>}

        <div className="mt-3 space-y-1">
          {view === "inbox" && <>
            {filteredContacts.demoContacts.map((contact) => {
              const isUnread = contact.unread && !readIds.includes(contact.id);
              return <button key={contact.id} type="button" onClick={() => openDemo(contact.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${activeDemoId === contact.id ? "bg-blue-400/15" : "hover:bg-blue-400/[.07]"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-300/20 bg-gradient-to-br from-blue-400/20 to-indigo-500/10 text-xs font-black text-blue-100">{initials(contact.display_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className={`truncate text-sm ${isUnread ? "font-black text-white" : "font-semibold text-blue-50/85"}`}>{contact.display_name}</span>{isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />}</span>
                  <span className="mt-1 block truncate text-[11px] text-blue-100/50">{contact.preview}</span>
                </span>
                <span className="flex flex-col items-end gap-1"><span className="text-[9px] text-blue-100/45">{contact.time}</span><span className="rounded-full border border-blue-100/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-100/55">Demo</span></span>
              </button>;
            })}
            {filteredContacts.realContacts.map((contact) => {
              const thread = messages.filter((message) => message.sender_id === contact.id || message.recipient_id === contact.id);
              const latest = thread.at(-1);
              const isUnread = Boolean(latest && latest.sender_id !== currentUserId && selectedRecipientId !== contact.id && !readIds.includes(contact.id));
              if (unreadOnly && !isUnread) return null;
              return <Link key={contact.id} href={`/dashboard/messages?to=${contact.id}`} onClick={() => setReadIds((current) => current.includes(contact.id) ? current : [...current, contact.id])} className={`flex items-center gap-3 rounded-xl p-3 transition ${contact.id === selectedRecipientId ? "bg-blue-400/15" : "hover:bg-blue-400/[.07]"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-xs font-black text-emerald-100">{initials(contact.display_name)}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className={`truncate text-sm ${isUnread ? "font-black text-white" : "font-semibold"}`}>{contact.display_name}</span>{isUnread && <span className="h-2 w-2 rounded-full bg-sky-400" />}</span><span className="mt-1 block truncate text-[11px] text-blue-100/50">{latest?.body ?? "No messages yet"}</span></span>
              </Link>;
            })}
            {filteredContacts.demoContacts.length === 0 && filteredContacts.realContacts.length === 0 && <p className="px-3 py-8 text-center text-xs leading-5 text-blue-100/45">No conversations match. Try clearing search or the unread filter.</p>}
          </>}

          {view === "requests" && <>
            {filteredRequests.map((request) => <article key={request.id} className={`rounded-xl border p-3 ${activeRequestId === request.id ? "border-blue-300/25 bg-blue-400/[.08]" : "border-blue-300/10 bg-[#071426]/70"}`}>
              <button type="button" onClick={() => { setActiveRequestId(request.id); setActiveDemoId(null); setActiveGroupId(null); }} className="w-full text-left">
                <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-violet-400/10 text-xs font-black text-violet-200">{initials(request.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{request.name}</span><span className="block truncate text-[10px] text-blue-100/45">{request.team}</span></span><span className="ml-auto rounded-full border border-blue-100/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-100/55">Demo</span></span>
                <span className="mt-3 block text-xs leading-5 text-blue-100/65">{request.note}</span>
              </button>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => acceptRequest(request.id)} className="flex-1 rounded-lg bg-blue-500 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-400"><Check className="mr-1 inline h-3 w-3" />Accept</button><button type="button" onClick={() => setDismissedRequestIds((current) => [...current, request.id])} className="rounded-lg border border-blue-100/15 px-3 py-2 text-[10px] font-bold text-blue-100/55 hover:text-white"><X className="h-3.5 w-3.5" /></button></div>
            </article>)}
            {filteredRequests.length === 0 && <p className="px-3 py-8 text-center text-xs text-blue-100/45">No message requests right now.</p>}
          </>}

          {view === "groups" && <>
            {filteredGroups.map((group) => {
              const isUnread = group.unread && !readIds.includes(group.id);
              return <button key={group.id} type="button" onClick={() => openGroup(group.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${activeGroupId === group.id ? "bg-blue-400/15" : "hover:bg-blue-400/[.07]"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-100"><Users className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-bold">{group.name}</span>{isUnread && <span className="h-2 w-2 rounded-full bg-sky-400" />}</span><span className="mt-1 block truncate text-[11px] text-blue-100/50">{group.members} members · {group.preview}</span></span>
                <span className="rounded-full border border-blue-100/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-100/55">Demo</span>
              </button>;
            })}
            {filteredGroups.length === 0 && <p className="px-3 py-8 text-center text-xs text-blue-100/45">No groups match this filter.</p>}
          </>}
        </div>
        {view === "inbox" && <p className="mt-4 px-2 text-center text-[10px] leading-5 text-blue-100/35">Live DMs are limited to mutual follows.<br /><Link href="/dashboard/community" className="font-bold text-blue-200 underline">Find managers</Link></p>}
      </aside>

      <section className={`flex min-h-[640px] flex-col ${hasSelection ? "" : "hidden md:flex"}`}>
        {selectedContact ? <>
          <header className="flex items-center gap-3 border-b border-blue-400/15 px-4 py-3 sm:px-5"><Link href="/dashboard/messages" className="grid h-9 w-9 place-items-center rounded-full border border-blue-300/20 md:hidden" aria-label="Back to inbox"><ArrowLeft className="h-4 w-4" /></Link><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-400/10 text-xs font-black text-emerald-100">{initials(selectedContact.display_name)}</span><div><p className="text-sm font-bold">{selectedContact.display_name}</p><p className="text-[10px] text-blue-200/55">Mutual follow · live conversation</p></div></header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            {liveThread.map((message) => <div key={message.id} className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_id === currentUserId ? "rounded-br-sm bg-blue-500 text-white" : "rounded-bl-sm border border-blue-300/15 bg-[#102642] text-blue-50"}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><time className="mt-1 block text-right text-[9px] text-blue-100/50" dateTime={message.created_at}>{messageTime(message.created_at)}</time></div></div>)}
            {liveThread.length === 0 && <div className="grid h-full min-h-64 place-content-center text-center"><MessageCircle className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 text-sm font-semibold">Start a private conversation</p><p className="mt-1 text-xs text-muted">Only you and {selectedContact.display_name} can read these messages.</p></div>}
          </div>
          <form action={sendDirectMessage.bind(null, selectedContact.id)} className="flex items-center gap-2 border-t border-blue-400/15 bg-[#091a30] p-3 sm:p-4"><Input name="body" required maxLength={4000} placeholder={`Message ${selectedContact.display_name}…`} className="h-12 rounded-full border-blue-300/15 bg-[#071426] text-blue-50 placeholder:text-blue-200/40" /><button className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-500 text-white hover:bg-blue-400" aria-label="Send direct message"><Send className="h-4 w-4" /></button></form>
        </> : activeDemo || activeGroup ? <>
          <header className="flex items-center gap-3 border-b border-blue-400/15 px-4 py-3 sm:px-5"><button type="button" onClick={() => { setActiveDemoId(null); setActiveGroupId(null); }} className="grid h-9 w-9 place-items-center rounded-full border border-blue-300/20 md:hidden" aria-label="Back to inbox"><ArrowLeft className="h-4 w-4" /></button><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-400/10 text-xs font-black text-blue-100">{activeGroup ? <Users className="h-4 w-4" /> : initials(activeDemo?.display_name ?? "")}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{activeGroup?.name ?? activeDemo?.display_name}</p><p className="text-[10px] text-blue-200/55">{activeGroup ? `${activeGroup.members} members · sample group chat` : "Sample conversation · demo only"}</p></div><span className="ml-auto rounded-full border border-blue-100/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-100/55">Demo</span></header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            {selectedMessages.map((message) => <div key={message.id} className={`flex ${message.senderId === "demo-me" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.senderId === "demo-me" ? "rounded-br-sm bg-blue-500 text-white" : "rounded-bl-sm border border-blue-300/15 bg-[#102642] text-blue-50"}`}>{activeGroup && message.senderId !== "demo-me" && <p className="mb-1 text-[10px] font-bold text-blue-200">{message.senderName}</p>}<p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><time className="mt-1 block text-right text-[9px] text-blue-100/50" dateTime={message.createdAt}>{messageTime(message.createdAt)}</time></div></div>)}
          </div>
          <form onSubmit={submitDemoMessage} className="flex items-center gap-2 border-t border-blue-400/15 bg-[#091a30] p-3 sm:p-4"><Input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} placeholder={activeGroup ? `Message ${activeGroup.name}…` : `Message ${activeDemo?.display_name}…`} className="h-12 rounded-full border-blue-300/15 bg-[#071426] text-blue-50 placeholder:text-blue-200/40" /><button className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-500 text-white hover:bg-blue-400" aria-label="Send demo message"><Send className="h-4 w-4" /></button></form>
        </> : activeRequest ? <div className="grid flex-1 place-content-center p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-400/10 text-violet-200"><UserRoundPlus className="h-6 w-6" /></span><p className="mt-4 text-lg font-black">{activeRequest.name}</p><p className="mt-1 text-xs text-blue-100/50">{activeRequest.team} · sample request</p><p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-blue-100/70">{activeRequest.note}</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={() => acceptRequest(activeRequest.id)} className="rounded-full bg-blue-500 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-400"><Check className="mr-1 inline h-3.5 w-3.5" />Accept request</button><button type="button" onClick={() => { setDismissedRequestIds((current) => [...current, activeRequest.id]); setActiveRequestId(null); }} className="rounded-full border border-blue-100/15 px-5 py-2.5 text-xs font-bold text-blue-100/65 hover:text-white">Decline</button></div></div> : <div className="grid flex-1 place-content-center p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl border border-blue-300/15 bg-blue-400/[.06] text-blue-200/70"><MessageCircle className="h-7 w-7" /></span><p className="mt-4 text-lg font-black">Your private inbox</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-blue-100/50">Choose a conversation, review a request, or jump into a group chat.</p></div>}
      </section>
    </div>
  </div>;
}
