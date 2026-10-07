import { getPlayers } from "@/lib/data";
import { RankingsTable } from "./rankings-table";

export default async function RankingsPage() {
  const players = await getPlayers();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rankings</h1>
        <p className="text-sm text-muted">
          Season half-PPR totals through Week 2, ranked overall and by position.
        </p>
      </div>
      <RankingsTable players={players} />
    </div>
  );
}
