import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Participant from "@/lib/models/participant";
import Round from "@/lib/models/round";
import { HOUSE_ORDER } from "@/lib/houses";
import type { HouseName } from "@/lib/models/participant";

/**
 * GET /api/admin/participants
 *
 * Returns all participants for the current active round, grouped by house.
 * Admin-only endpoint.
 */
export async function GET(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({
        roundNumber: 1,
        counts: { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 },
        participants: {
          gryffindor: [],
          slytherin: [],
          ravenclaw: [],
          hufflepuff: [],
        },
      });
    }

    // Fetch all participants for the active round, sorted by creation time
    const participants = await Participant.find({
      round: round.roundNumber,
    }).sort({ createdAt: 1 });

    // Group by house
    const grouped: Record<HouseName, Array<{ name: string; usn: string; createdAt: Date }>> = {
      gryffindor: [],
      slytherin: [],
      ravenclaw: [],
      hufflepuff: [],
    };

    for (const p of participants) {
      const house = p.house as HouseName;
      if (grouped[house]) {
        grouped[house].push({
          name: p.name,
          usn: p.usn,
          createdAt: p.createdAt,
        });
      }
    }

    return NextResponse.json({
      roundNumber: round.roundNumber,
      counts: {
        gryffindor: round.counts.gryffindor ?? 0,
        slytherin: round.counts.slytherin ?? 0,
        ravenclaw: round.counts.ravenclaw ?? 0,
        hufflepuff: round.counts.hufflepuff ?? 0,
      },
      participants: grouped,
    });
  } catch (error) {
    console.error("Participants fetch error:", error);
    return NextResponse.json(
      { error: "Unable to fetch participants" },
      { status: 500 }
    );
  }
}
