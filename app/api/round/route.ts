import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Round from "@/lib/models/round";

/**
 * GET /api/round
 *
 * Returns the current active round's house counts.
 * Public endpoint — used by the landing page to show total participants.
 */
export async function GET() {
  try {
    await connectDB();

    let round = await Round.findOne({ status: "active" });

    if (!round) {
      // Auto-create round 1 if none exists
      round = await Round.create({
        roundNumber: 1,
        status: "active",
        counts: { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 },
      });
    }

    return NextResponse.json({
      roundNumber: round.roundNumber,
      counts: {
        gryffindor: round.counts.gryffindor ?? 0,
        slytherin: round.counts.slytherin ?? 0,
        ravenclaw: round.counts.ravenclaw ?? 0,
        hufflepuff: round.counts.hufflepuff ?? 0,
      },
    });
  } catch (error) {
    console.error("Round fetch error:", error);
    return NextResponse.json(
      { error: "Unable to fetch round data" },
      { status: 500 }
    );
  }
}
