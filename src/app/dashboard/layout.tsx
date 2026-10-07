import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { GridironAssistant } from "@/components/gridiron-assistant";
import { FantasyPreferenceControls, FantasyPreferencesProvider } from "@/components/fantasy-preferences";
import { LogOut } from "lucide-react";
import { DashboardNavigation } from "./dashboard-navigation";
import { getCollegeFootballRankings } from "@/lib/college-football-live";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ data: { user } }, collegeRankings] = await Promise.all([
    supabase.auth.getUser(),
    getCollegeFootballRankings(),
  ]);
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? "Guest";

  return (
    <FantasyPreferencesProvider>
    <div className="flex min-h-screen min-w-0 bg-background">
      <aside className="hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 sm:flex">
        <Link href="/dashboard" className="mb-8 px-2">
          <Logo height={34} />
        </Link>
        <DashboardNavigation />
        <div className="border-t border-border pt-4">
          <p className="truncate px-2 text-sm font-medium">{displayName}</p>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="mt-1 w-full justify-start gap-2 text-muted">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
          <Link href="/dashboard">
            <Logo height={26} />
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <DashboardNavigation mobile />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-8">
          <div className="mb-5 flex justify-end"><FantasyPreferenceControls /></div>
          {children}
        </main>
      </div>
      <GridironAssistant collegeRankings={collegeRankings} />
    </div>
    </FantasyPreferencesProvider>
  );
}
