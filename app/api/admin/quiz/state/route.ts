import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "No active round" }, { status: 404 });
    }

    let questionData = null;
    if (round.currentQuestion > 0) {
      const q = await Question.findOne({ round: round.roundNumber, questionNumber: round.currentQuestion });
      if (q) {
        questionData = {
          questionNumber: q.questionNumber,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
        };
      }
    }

    return NextResponse.json({
      roundNumber: round.roundNumber,
      gameState: round.gameState,
      currentQuestion: round.currentQuestion,
      questionStartedAt: round.questionStartedAt,
      questionEndsAt: round.questionEndsAt,
      questionData,
    });
  } catch (error) {
    console.error("Admin quiz state error:", error);
    return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  }
}
