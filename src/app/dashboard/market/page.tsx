import { redirect } from "next/navigation";

// Market is now a tab on the consolidated Player Analysis page -
// see src/app/dashboard/player-analysis/page.tsx.
export default function PlayerMarketPage() {
  redirect("/dashboard/player-analysis?tab=market");
}
