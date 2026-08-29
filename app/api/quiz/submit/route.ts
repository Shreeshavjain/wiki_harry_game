import { NextResponse } from "next/server";
import { connectDB, startSession } from "@/lib/db";
import Participant from "@/lib/models/participant";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";
import Answer from "@/lib/models/answer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usn, questionNumber, selectedOption, quizAttempt } = body;

    if (!usn || !questionNumber || !selectedOption) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "Quiz is not active" }, { status: 400 });
    }
    if (round.gameState === "PAUSED") {
      return NextResponse.json({ error: "Quiz is paused" }, { status: 403 });
    }
    if (round.gameState !== "LIVE") {
      return NextResponse.json({ error: "Quiz is not LIVE" }, { status: 400 });
    }

    if (quizAttempt && round.quizAttempt !== quizAttempt) {
      return NextResponse.json({ error: "Stale submission from old quiz attempt" }, { status: 400 });
    }

    if (round.currentQuestion !== questionNumber) {
      return NextResponse.json({ error: "Submission for wrong question" }, { status: 400 });
    }

    if (round.questionEndsAt && new Date() > round.questionEndsAt) {
      return NextResponse.json({ error: "Time is up for this question" }, { status: 400 });
    }

    const participant = await Participant.findOne({ usn, round: round.roundNumber });
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const question = await Question.findOne({ round: round.roundNumber, questionNumber });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isCorrect = question.correct_option === selectedOption;

    let correctRank: number | null = null;
    let pointsAwarded = 0;

    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        // Re-check answer existence within transaction
        const existingAnswer = await Answer.findOne({
          participantId: participant._id,
          questionId: question._id,
        }).session(session);

        if (existingAnswer) {
          throw new Error("ALREADY_ANSWERED");
        }

        if (isCorrect) {
          const updatedQuestion = await Question.findOneAndUpdate(
            { _id: question._id },
            { $inc: { correctAnswersCount: 1 } },
            { new: true, session }
          );

          if (!updatedQuestion) throw new Error("Failed to update question");

          correctRank = updatedQuestion.correctAnswersCount;
          pointsAwarded = correctRank === 1 ? 2 : 1;
        }

        await Answer.create(
          [
            {
              round: round.roundNumber,
              participantId: participant._id,
              questionId: question._id,
              questionNumber: question.questionNumber,
              selectedOption,
              isCorrect,
              correctRank,
              pointsAwarded,
            },
          ],
          { session }
        );

        const updatePayload: any = {
          $addToSet: { "quizState.answeredQuestions": questionNumber },
        };
        if (pointsAwarded > 0) {
          updatePayload.$inc = { "quizState.score": pointsAwarded };
        }

        await Participant.findOneAndUpdate(
          { _id: participant._id },
          updatePayload,
          { session }
        );
      });
    } catch (err: any) {
      if (err.message === "ALREADY_ANSWERED" || err.code === 11000) {
        return NextResponse.json(
          { error: "You have already answered this question" },
          { status: 400 }
        );
      }
      throw err;
    } finally {
      await session.endSession();
    }

    return NextResponse.json({
      success: true,
      selectedOption,
      // Temporarily hiding correctness to match game flow (wait for admin reveal)
    });
  } catch (error) {
    console.error("Answer submission error:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
