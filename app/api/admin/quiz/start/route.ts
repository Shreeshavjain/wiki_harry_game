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

    if (round.gameState === "LIVE") {
      return NextResponse.json({ error: "Quiz is already LIVE" }, { status: 400 });
    }

    if (round.gameState !== "QUESTIONS_READY") {
      return NextResponse.json(
        { error: "Cannot start quiz without questions. Upload questions first." },
        { status: 400 }
      );
    }

    const questionCount = await Question.countDocuments({ round: round.roundNumber });
    if (questionCount === 0) {
      return NextResponse.json(
        { error: "No questions found for this round. Upload questions first." },
        { status: 400 }
      );
    }

    round.gameState = "LIVE";
    await round.save();

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
