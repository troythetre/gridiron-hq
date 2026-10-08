import { NextResponse } from "next/server";
import { getSportsGameOddsEvents } from "@/lib/sports-game-odds";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const league =
      searchParams.get("league") === "CFB"
        ? "NCAAF"
        : "NFL";

    const events =
      await getSportsGameOddsEvents(league);

    return NextResponse.json({
      success: true,
      league,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("SportsGameOdds error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load sportsbook data.",
      },
      { status: 500 }
    );
  }
}
