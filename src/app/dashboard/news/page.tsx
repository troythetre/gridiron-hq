import { getNews } from "@/lib/data";
import { NewsFeed } from "./news-feed";

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fantasy News</h1>
        <p className="text-sm text-muted">NFL and fantasy headlines, linked to the original reporting and tagged for PPR, half-PPR, and dynasty context.</p>
      </div>
      <NewsFeed news={news} />
    </div>
  );
}
