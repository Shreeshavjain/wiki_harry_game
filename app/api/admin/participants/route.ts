import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Participant from "@/lib/models/participant";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";
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
        gameState: "WAITING",
        questionCount: 0,
        counts: { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 },
        houseScores: { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 },
        participants: {
          gryffindor: [],
          slytherin: [],
          ravenclaw: [],
          hufflepuff: [],
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const questionCount = await Question.countDocuments({ round: round.roundNumber });

    // Build the query to filter by round
    const query: any = { round: round.roundNumber };
    if (search.trim() !== "") {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { usn: { $regex: q, $options: "i" } },
      ];
    }

    // Fetch all participants for the active round, sorted by creation time
    const participants = await Participant.find(query).sort({ createdAt: 1 });

    // We need all participants to compute total house scores correctly.
    // If we only fetched searched participants, the scoreboard totals would drop.
    const allParticipants = await Participant.find({ round: round.roundNumber }, { house: 1, 'quizState.score': 1 });
    const houseScores: Record<HouseName, number> = {
      gryffindor: 0,
      slytherin: 0,
      ravenclaw: 0,
      hufflepuff: 0,
    };
    for (const p of allParticipants) {
      const house = p.house as HouseName;
      const score = p.quizState?.score ?? 0;
      houseScores[house] += score;
    }

    // Now group the filtered participants
    const grouped: Record<HouseName, Array<{ name: string; usn: string; createdAt: Date; score: number }>> = {
      gryffindor: [],
      slytherin: [],
      ravenclaw: [],
      hufflepuff: [],
    };

    for (const p of participants) {
      const house = p.house as HouseName;
      const score = p.quizState?.score ?? 0;
      
      if (grouped[house]) {
        grouped[house].push({
          name: p.name,
          usn: p.usn,
          createdAt: p.createdAt,
          score: score,
        });
      }
    }

    return NextResponse.json({
      roundNumber: round.roundNumber,
      gameState: round.gameState,
      questionCount,
      counts: {
        gryffindor: round.counts.gryffindor ?? 0,
        slytherin: round.counts.slytherin ?? 0,
        ravenclaw: round.counts.ravenclaw ?? 0,
        hufflepuff: round.counts.hufflepuff ?? 0,
      },
      houseScores,
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
