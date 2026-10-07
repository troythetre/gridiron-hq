import { getNews } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fantasy News</h1>
        <p className="text-sm text-muted">Short, sourced blurbs on what actually moves your lineup.</p>
      </div>

      <div className="space-y-4">
        {news.map((n) => (
          <Card key={n.id}>
            <CardHeader>
              <CardTitle>{n.headline}</CardTitle>
              <p className="text-xs text-muted">{n.item_date}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90">{n.body}</p>
              {n.source && <p className="mt-2 text-xs text-muted">{n.source}</p>}
            </CardContent>
          </Card>
        ))}
        {news.length === 0 && (
          <p className="py-8 text-center text-muted">No news items on file right now.</p>
        )}
      </div>
    </div>
  );
}
