import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageCenter } from "./message-center";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profiles }, { data: follows }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("id,display_name").neq("id", user.id).order("display_name").limit(200),
    supabase.from("user_follows").select("follower_id,following_id").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
    supabase.from("direct_messages").select("id,sender_id,recipient_id,body,created_at").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(500),
  ]);
  const followsFromYou = new Set((follows ?? []).filter((follow) => follow.follower_id === user.id).map((follow) => follow.following_id));
  const followsYou = new Set((follows ?? []).filter((follow) => follow.following_id === user.id).map((follow) => follow.follower_id));
  const contacts = (profiles ?? []).filter((profile) => followsFromYou.has(profile.id) && followsYou.has(profile.id));
  const recipient = contacts.find((contact) => contact.id === to) ?? null;
  const contactIds = new Set(contacts.map((contact) => contact.id));
  const visibleMessages = (messages ?? []).filter((message) => contactIds.has(message.sender_id === user.id ? message.recipient_id : message.sender_id)).reverse();

  return <MessageCenter currentUserId={user.id} contacts={contacts} messages={visibleMessages} selectedRecipientId={recipient?.id ?? null} />;
}
