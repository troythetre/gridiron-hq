import { getPlayers, getInjuries } from "@/lib/data";
import { StartSitTool } from "./start-sit-tool";

export default async function StartSitPage() {
  const [players, injuries] = await Promise.all([getPlayers(), getInjuries()]);
  const injuriesByName = Object.fromEntries(injuries.map((i) => [i.name, i]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Start/Sit</h1>
        <p className="text-sm text-muted">Pick two players and let the engine make the call.</p>
      </div>
      <StartSitTool players={players} injuriesByName={injuriesByName} />
    </div>
  );
}
