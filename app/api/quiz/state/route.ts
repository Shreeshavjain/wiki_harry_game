import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Participant from "@/lib/models/participant";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usn = searchParams.get("usn");
    if (!usn) return NextResponse.json({ error: "Missing USN" }, { status: 400 });

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) return NextResponse.json({ error: "No active round" }, { status: 404 });

    const participant = await Participant.findOne({ usn, round: round.roundNumber });
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

    // Handle lazy transition if LIVE and time expired
    if (round.gameState === "LIVE" && round.questionEndsAt) {
      if (new Date() > round.questionEndsAt) {
        // Time expired! Transition to TIME_UP atomically.
        const updatedRound = await Round.findOneAndUpdate(
          { _id: round._id, currentQuestion: round.currentQuestion, gameState: "LIVE" },
          { gameState: "TIME_UP" },
          { new: true }
        );
        if (updatedRound) {
           // Successfully transitioned it
           round.gameState = updatedRound.gameState;
        } else {
           // Someone else transitioned it, fetch fresh
           const freshRound = await Round.findOne({ _id: round._id });
           if (freshRound) {
             round.gameState = freshRound.gameState;
           }
        }
      }
    }

    let questionData = null;
    let hasAnswered = false;
    let answeredResult = null; // Return the result if already answered

    console.log(`[QUIZ STATE] Round ${round.roundNumber} | State: ${round.gameState} | currentQ: ${round.currentQuestion}`);

    if ((round.gameState === "LIVE" || round.gameState === "TIME_UP" || round.gameState === "REVEAL") && round.currentQuestion > 0) {
      const q = await Question.findOne({ round: round.roundNumber, questionNumber: round.currentQuestion });
      if (q) {
        questionData = {
          questionNumber: q.questionNumber,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          ...(round.gameState === "REVEAL" && { correct_option: q.correct_option }),
        };
        hasAnswered = participant.quizState?.answeredQuestions?.includes(q.questionNumber) ?? false;
      } else {
        console.error(`[QUIZ STATE ERROR] ACTIVE_QUESTION_NOT_FOUND for Round ${round.roundNumber}, Q: ${round.currentQuestion}`);
        return NextResponse.json({
          error: "ACTIVE_QUESTION_NOT_FOUND",
          currentQuestion: round.currentQuestion,
          round: round.roundNumber
        }, { status: 409 });
      }
    }

    return NextResponse.json({
      gameState: round.gameState,
      currentQuestion: round.currentQuestion,
      questionStartedAt: round.questionStartedAt,
      questionEndsAt: round.questionEndsAt,
      score: participant.quizState?.score ?? 0,
      house: participant.house,
      questionData,
      hasAnswered,
      frozenRemainingMs: round.frozenRemainingMs,
      quizAttempt: round.quizAttempt || 1,
    });
  } catch (error) {
    console.error("Quiz state error:", error);
    return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  }
}
