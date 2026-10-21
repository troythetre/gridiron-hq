import { redirect } from "next/navigation";

// News is now a tab on the consolidated Player Analysis page -
// see src/app/dashboard/player-analysis/page.tsx.
export default function NewsPage() {
  redirect("/dashboard/player-analysis?tab=news");
}
