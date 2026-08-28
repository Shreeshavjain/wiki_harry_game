import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";

export async function POST(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "No active round found" }, { status: 404 });
    }

    if (round.gameState !== "LIVE") {
      return NextResponse.json({ error: "Only LIVE quizzes can be paused", currentGameState: round.gameState }, { status: 400 });
    }

    // Verify whether the current question has already expired before freezing it
    if (round.questionEndsAt && new Date() > round.questionEndsAt) {
      // Time expired! Try to transition atomically first.
      const nextQ = round.currentQuestion + 1;
      const totalQ = await Question.countDocuments({ round: round.roundNumber });
      
      let newState = "LIVE";
      if (nextQ > totalQ) {
         newState = "COMPLETED";
      }
      
      const now = new Date();
      const endsAt = new Date(now.getTime() + 60000);

      const updatedRound = await Round.findOneAndUpdate(
        { _id: round._id, currentQuestion: round.currentQuestion, gameState: "LIVE" },
        { 
          currentQuestion: nextQ,
          questionStartedAt: newState === "LIVE" ? now : null,
          questionEndsAt: newState === "LIVE" ? endsAt : null,
          gameState: newState
        },
        { new: true }
      );
      
      if (updatedRound) {
         round = updatedRound;
      } else {
         const freshRound = await Round.findOne({ _id: round._id });
         if (freshRound) round = freshRound;
      }
      
      // If it transitioned to COMPLETED, we cannot pause it.
      if (round.gameState === "COMPLETED") {
        return NextResponse.json({ error: "Quiz has completed naturally, cannot pause", currentGameState: round.gameState }, { status: 400 });
      }
    }

    // Now freeze it atomically
    const frozenRemainingMs = round.questionEndsAt ? Math.max(0, round.questionEndsAt.getTime() - Date.now()) : 0;
    
    const pausedRound = await Round.findOneAndUpdate(
      { _id: round._id, gameState: "LIVE", currentQuestion: round.currentQuestion },
      {
        gameState: "PAUSED",
        questionStartedAt: null,
        questionEndsAt: null,
        frozenRemainingMs
      },
      { new: true }
    );

    if (!pausedRound) {
       return NextResponse.json({ error: "Failed to pause. State may have changed.", currentGameState: round.gameState }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      gameState: pausedRound.gameState,
      frozenRemainingMs: pausedRound.frozenRemainingMs,
      currentQuestion: pausedRound.currentQuestion
    });
  } catch (error) {
    console.error("Pause quiz error:", error);
    return NextResponse.json({ error: "Failed to pause quiz" }, { status: 500 });
  }
}
