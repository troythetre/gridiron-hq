import { getPlayers } from "@/lib/data";
import { RankingsTable } from "./rankings-table";

export default async function RankingsPage() {
  const players = await getPlayers();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rankings</h1>
        <p className="text-sm text-muted">
          Current production, player bios, game logs, and trend charts. Select a name to open the full player card.
        </p>
      </div>
      <RankingsTable players={players} />
    </div>
  );
}
