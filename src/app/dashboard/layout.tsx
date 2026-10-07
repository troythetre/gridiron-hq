import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { GridironAssistant } from "@/components/gridiron-assistant";
import { FantasyPreferenceControls, FantasyPreferencesProvider } from "@/components/fantasy-preferences";
import { LogOut } from "lucide-react";
import { DashboardTopNavigation } from "./dashboard-navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? "Guest";

  return (
    <FantasyPreferencesProvider>
    <div className="relative min-h-screen min-w-0 bg-background">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,rgba(37,99,235,.11),transparent_38%),radial-gradient(ellipse_at_85%_5%,rgba(124,58,237,.1),transparent_34%)]" />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-col">
        <DashboardTopNavigation trailing={
          <form action={logout} className="shrink-0">
            <Button type="submit" variant="ghost" size="icon" aria-label={`Sign out ${displayName}`} title="Sign out" className="h-9 w-9 rounded-full border border-white/10 bg-white/[.04] text-blue-100/70 transition hover:bg-white/[.1] hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        } />
        <main className="mx-auto min-w-0 w-full max-w-7xl flex-1 px-4 py-5 sm:px-8 sm:py-7">
          <div className="mb-5 flex justify-end"><FantasyPreferenceControls /></div>
          {children}
        </main>
      </div>
      <GridironAssistant />
    </div>
    </FantasyPreferencesProvider>
  );
}
