import { redirect } from "next/navigation";

// Compare is now a tab on the consolidated Player Analysis page -
// see src/app/dashboard/player-analysis/page.tsx.
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ player?: string }> }) {
  const params = await searchParams;
  redirect(`/dashboard/player-analysis?tab=compare${params.player ? `&player=${params.player}` : ""}`);
}
