import { redirect } from "next/navigation";

// Rankings is now a tab on the consolidated Player Analysis page -
// see src/app/dashboard/player-analysis/page.tsx.
export default function RankingsPage() {
  redirect("/dashboard/player-analysis?tab=rankings");
}
