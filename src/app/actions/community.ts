"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const PostSchema = z.string().trim().min(1).max(4000);
const ReplySchema = z.string().trim().min(1).max(2000);
const MessageSchema = z.string().trim().min(1).max(4000);

// Function to create an anonymous forum post
export async function createAnonymousForumPost(formData: FormData) {
  const body = PostSchema.safeParse(formData.get("body"));
  if (!body.success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.rpc("create_anonymous_forum_post", { p_body: body.data });
  revalidatePath("/dashboard/community");
}

// Function to create an anonymous forum reply to a specific post
export async function createAnonymousForumReply(postId: string, formData: FormData) {
  const body = ReplySchema.safeParse(formData.get("body"));
  if (!body.success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.rpc("create_anonymous_forum_reply", { p_post_id: postId, p_body: body.data });
  revalidatePath("/dashboard/community");
}

// Function to toggle following/unfollowing a user
export async function toggleFollow(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const targetId = z.uuid().safeParse(formData.get("targetId"));
  if (!targetId.success) return;
  if (targetId.data === user.id) return;

  const { data: existing } = await supabase.from("user_follows")
    .select("follower_id").eq("follower_id", user.id).eq("following_id", targetId.data).maybeSingle();
  if (existing) {
    await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", targetId.data);
  } else {
    await supabase.from("user_follows").insert({ follower_id: user.id, following_id: targetId.data });
  }
  revalidatePath("/dashboard/community");
  revalidatePath("/dashboard/messages");
}

// Function to send a direct message to another user
export async function sendDirectMessage(recipientId: string, formData: FormData) {
  const body = MessageSchema.safeParse(formData.get("body"));
  if (!body.success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!z.uuid().safeParse(recipientId).success || recipientId === user.id) return;

  const { data: follows } = await supabase.from("user_follows")
    .select("follower_id,following_id")
    .or(`and(follower_id.eq.${user.id},following_id.eq.${recipientId}),and(follower_id.eq.${recipientId},following_id.eq.${user.id})`);
  const reciprocal = new Set((follows ?? []).map((follow) => `${follow.follower_id}:${follow.following_id}`));
  if (!reciprocal.has(`${user.id}:${recipientId}`) || !reciprocal.has(`${recipientId}:${user.id}`)) return;

  await supabase.from("direct_messages").insert({ sender_id: user.id, recipient_id: recipientId, body: body.data });
  revalidatePath("/dashboard/messages");
  redirect(`/dashboard/messages?to=${recipientId}`);
}
