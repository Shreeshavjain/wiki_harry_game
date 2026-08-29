import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";

export async function POST() {
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

    if (round.gameState !== "REVEAL") {
      return NextResponse.json(
        { error: "Invalid state transition. Can only proceed to next question from REVEAL state." },
        { status: 400 }
      );
    }

    // Block advancing if a projector race display is active
    const displayMode = round.projectorDisplay?.mode || "NORMAL";
    if (displayMode !== "NORMAL") {
      return NextResponse.json(
        { error: "Hide the active projector display before starting the next question." },
        { status: 400 }
      );
    }

    const nextQuestionNumber = round.currentQuestion + 1;
    const nextQuestion = await Question.findOne({ round: round.roundNumber, questionNumber: nextQuestionNumber });

    if (!nextQuestion) {
      return NextResponse.json(
        { error: "This is the final question. Cannot advance further." },
        { status: 400 }
      );
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + 63000); // 3 sec buffer + 60s

    const updatedRound = await Round.findOneAndUpdate(
      { _id: round._id, gameState: "REVEAL", currentQuestion: round.currentQuestion },
      {
        $set: {
          gameState: "LIVE",
          currentQuestion: nextQuestionNumber,
          questionStartedAt: now,
          questionEndsAt: endsAt,
        }
      },
      { new: true }
    );

    if (!updatedRound) {
       return NextResponse.json(
         { error: "Failed to transition state. Game state might have changed concurrently." },
         { status: 409 }
       );
    }

    return NextResponse.json({
      success: true,
      message: "Moved to next question",
      gameState: "LIVE",
      currentQuestion: nextQuestionNumber
    });
  } catch (error) {
    console.error("Next question error:", error);
    return NextResponse.json({ error: "Failed to start next question" }, { status: 500 });
  }
}
