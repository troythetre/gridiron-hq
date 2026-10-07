import { ParlayLab } from "./parlay-lab";

export default async function ParlayPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialSport = params.sport === "CFB" ? "CFB" : "NFL";
  const initialTab = params.tab === "mock-draft" || params.tab === "college" ? params.tab : "parlay";
  return <ParlayLab key={`${initialSport}:${initialTab}`} initialSport={initialSport} initialTab={initialTab} />;
}
