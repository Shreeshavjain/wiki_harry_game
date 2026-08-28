import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";

export async function POST(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "No active round found" }, { status: 404 });
    }

    if (round.gameState !== "PAUSED") {
      return NextResponse.json({ error: "Only PAUSED quizzes can be resumed", currentGameState: round.gameState }, { status: 400 });
    }

    const now = new Date();
    // Recreate questionEndsAt based on frozenRemainingMs.
    // E.g. if 20000ms was left, it ends 20 seconds from now.
    // The questionStartedAt is just (endsAt - 60s) to maintain the 60s total visual window.
    const endsAt = new Date(now.getTime() + round.frozenRemainingMs);
    const startedAt = new Date(endsAt.getTime() - 60000); 

    const resumedRound = await Round.findOneAndUpdate(
      { _id: round._id, gameState: "PAUSED" },
      {
        gameState: "LIVE",
        questionStartedAt: startedAt,
        questionEndsAt: endsAt,
        frozenRemainingMs: 0
      },
      { new: true }
    );

    if (!resumedRound) {
       return NextResponse.json({ error: "Failed to resume. State may have changed.", currentGameState: round.gameState }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      gameState: resumedRound.gameState,
      questionEndsAt: resumedRound.questionEndsAt
    });
  } catch (error) {
    console.error("Resume quiz error:", error);
    return NextResponse.json({ error: "Failed to resume quiz" }, { status: 500 });
  }
}
