import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityHub } from "./community-hub";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [postsResult, peopleResult, followsResult] = await Promise.all([
    supabase.from("forum_posts").select("id,body,created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("profiles").select("id,display_name").neq("id", user.id).order("display_name").limit(200),
    supabase.from("user_follows").select("follower_id,following_id").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
  ]);
  const posts = postsResult.data;
  const people = peopleResult.data;
  const follows = followsResult.data;
  const postIds = (posts ?? []).map((post) => post.id);
  const { data: replies } = postIds.length
    ? await supabase.from("forum_replies").select("id,post_id,body,created_at").in("post_id", postIds).order("created_at").limit(500)
    : { data: [] };
  const followRows = follows ?? [];

  return <CommunityHub
    setupReady={!postsResult.error && !followsResult.error}
    posts={posts ?? []}
    replies={replies ?? []}
    people={people ?? []}
    followingIds={followRows.filter((row) => row.follower_id === user.id).map((row) => row.following_id)}
    followerIds={followRows.filter((row) => row.following_id === user.id).map((row) => row.follower_id)}
  />;
}
