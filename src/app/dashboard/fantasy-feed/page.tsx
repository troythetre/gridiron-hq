import { getFantasyVideos } from "@/lib/data";
import { FantasyVideoFeed } from "./video-feed";

export default async function FantasyFeedPage() {
  const videos = await getFantasyVideos();
  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#181818,#080808_70%)] p-6 sm:p-9">
      <p className="text-[10px] font-bold uppercase tracking-[.22em] text-muted">Film room</p>
      <h1 className="mt-2 font-display text-4xl font-black sm:text-6xl">Fantasy Feed</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Fresh NFL fantasy video analysis for player news, weekly lineups, PPR strategy, and dynasty outlooks.</p>
    </header>
    <FantasyVideoFeed videos={videos} />
  </div>;
}
