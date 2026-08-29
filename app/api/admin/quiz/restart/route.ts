import { NextResponse } from "next/server";
import { connectDB, startSession } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";
import Participant from "@/lib/models/participant";
import Question from "@/lib/models/question";
import Answer from "@/lib/models/answer";

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

    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        // 1. Reset all participants' quiz score and answeredQuestions in this round
        await Participant.updateMany(
          { round: round.roundNumber },
          { 
            $set: { 
              "quizState.score": 0, 
              "quizState.answeredQuestions": [] 
            } 
          },
          { session }
        );

        // 2. Reset all questions' correctAnswersCount in this round
        await Question.updateMany(
          { round: round.roundNumber },
          { 
            $set: { 
              correctAnswersCount: 0 
            } 
          },
          { session }
        );

        // 3. Delete all answers for this round
        await Answer.deleteMany(
          { round: round.roundNumber },
          { session }
        );

        // 4. Update the Round to RESTARTED state, clear timer, bump quizAttempt
        await Round.findOneAndUpdate(
          { _id: round._id },
          {
            $set: {
              gameState: "RESTARTED",
              currentQuestion: 0,
              questionStartedAt: null,
              questionEndsAt: null,
              frozenRemainingMs: 0,
              projectorDisplay: { mode: "NORMAL", selectedHouse: null },
            },
            $inc: {
              quizAttempt: 1
            }
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({
      success: true,
      message: "Quiz restarted successfully",
      gameState: "RESTARTED",
    });
  } catch (error) {
    console.error("Restart quiz error:", error);
    return NextResponse.json({ error: "Failed to restart quiz" }, { status: 500 });
  }
}
