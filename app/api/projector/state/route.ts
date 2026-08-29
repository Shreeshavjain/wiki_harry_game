import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";
import Participant from "@/lib/models/participant";

export async function GET() {
  try {
    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "No active round" }, { status: 404 });
    }

    // Optional: lazy transition if LIVE and time expired to keep projector in sync 
    // even if nobody else triggers it (similar to participant state).
    if (round.gameState === "LIVE" && round.questionEndsAt) {
      if (new Date() > round.questionEndsAt) {
        const updatedRound = await Round.findOneAndUpdate(
          { _id: round._id, currentQuestion: round.currentQuestion, gameState: "LIVE" },
          { gameState: "TIME_UP" },
          { new: true }
        );
        if (updatedRound) {
           round.gameState = updatedRound.gameState;
        } else {
           const freshRound = await Round.findOne({ _id: round._id });
           if (freshRound) round.gameState = freshRound.gameState;
        }
      }
    }

    let questionData = null;
    let totalQuestions = 0;

    // Get total questions for the UI (e.g. "QUESTION 1 / 15")
    if (round.roundNumber) {
        totalQuestions = await Question.countDocuments({ round: round.roundNumber });
    }
    
    // In LOBBY, count total participants
    let totalParticipants = 0;
    if (round.gameState === "WAITING" || round.gameState === "QUESTIONS_READY") {
       totalParticipants = await Participant.countDocuments({ round: round.roundNumber });
    }

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
      }
    }

    return NextResponse.json({
      gameState: round.gameState,
      currentQuestion: round.currentQuestion,
      totalQuestions,
      questionStartedAt: round.questionStartedAt,
      questionEndsAt: round.questionEndsAt,
      questionData,
      counts: round.counts,
      totalParticipants
    });
  } catch (error) {
    console.error("Projector state error:", error);
    return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  }
}
