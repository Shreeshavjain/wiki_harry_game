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

    // If the game is LIVE but currentQuestion is missing/0 (broken state), allow repairing it.
    const isBrokenLive = round.gameState === "LIVE" && !round.currentQuestion;

    if (round.gameState === "LIVE" && !isBrokenLive) {
      return NextResponse.json({ error: "Quiz is already LIVE" }, { status: 400 });
    }

    if (round.gameState !== "QUESTIONS_READY" && round.gameState !== "RESTARTED" && !isBrokenLive) {
      return NextResponse.json(
        { error: "Cannot start quiz without questions. Upload questions first." },
        { status: 400 }
      );
    }

    const firstQuestion = await Question.findOne({ round: round.roundNumber }).sort({ questionNumber: 1 });
    if (!firstQuestion) {
      return NextResponse.json(
        { error: "No questions found for this round. Upload questions first." },
        { status: 400 }
      );
    }

    // Start the quiz with a 3-second buffer for the UI countdown + 60 seconds
    const now = new Date();
    const endsAt = new Date(now.getTime() + 63000); 

    // Use findOneAndUpdate to bypass any stale Mongoose schema cache from stripping new fields
    await Round.findOneAndUpdate(
      { _id: round._id },
      {
        $set: {
          gameState: "LIVE",
          currentQuestion: firstQuestion.questionNumber,
          questionStartedAt: now,
          questionEndsAt: endsAt,
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: "Quiz started successfully",
      gameState: "LIVE",
    });
  } catch (error) {
    console.error("Quiz start error:", error);
    return NextResponse.json({ error: "Failed to start quiz" }, { status: 500 });
  }
}
