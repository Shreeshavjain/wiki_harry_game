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
        // Time expired! Try to transition atomically.
        const nextQ = round.currentQuestion + 1;
        const totalQ = await Question.countDocuments({ round: round.roundNumber });
        
        let newState = "LIVE";
        if (nextQ > totalQ) {
           newState = "COMPLETED";
        }
        
        const now = new Date();
        const endsAt = new Date(now.getTime() + 60000); // 60 seconds for next question

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
           // Successfully transitioned it
           round.currentQuestion = updatedRound.currentQuestion;
           round.gameState = updatedRound.gameState;
           round.questionStartedAt = updatedRound.questionStartedAt;
           round.questionEndsAt = updatedRound.questionEndsAt;
        } else {
           // Someone else transitioned it, fetch fresh
           const freshRound = await Round.findOne({ _id: round._id });
           if (freshRound) {
             round.currentQuestion = freshRound.currentQuestion;
             round.gameState = freshRound.gameState;
             round.questionStartedAt = freshRound.questionStartedAt;
             round.questionEndsAt = freshRound.questionEndsAt;
           }
        }
      }
    }

    let questionData = null;
    let hasAnswered = false;
    let answeredResult = null; // Return the result if already answered

    console.log(`[QUIZ STATE] Round ${round.roundNumber} | State: ${round.gameState} | currentQ: ${round.currentQuestion}`);

    if (round.gameState === "LIVE" && round.currentQuestion > 0) {
      const q = await Question.findOne({ round: round.roundNumber, questionNumber: round.currentQuestion });
      if (q) {
        questionData = {
          questionNumber: q.questionNumber,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
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
