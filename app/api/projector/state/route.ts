import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Round from "@/lib/models/round";
import Question from "@/lib/models/question";
import Participant from "@/lib/models/participant";

import Answer from "@/lib/models/answer";

export const dynamic = "force-dynamic";

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

    let histogram: Record<string, number> | undefined;
    let fastestAnswers: any[] | undefined;
    let questionHousePoints: Record<string, number> | undefined;

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

        if (round.gameState === "REVEAL") {
          // Calculate histogram, top 5, and house points for the current question
          const answers = await Answer.find({ 
            round: round.roundNumber, 
            questionNumber: round.currentQuestion 
          }).populate("participantId");

          histogram = { A: 0, B: 0, C: 0, D: 0 };
          questionHousePoints = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
          const correctAnswersList = [];

          for (const ans of answers) {
            // Histogram
            if (histogram[ans.selectedOption] !== undefined) {
              histogram[ans.selectedOption]++;
            }

            const participant = ans.participantId as any;
            if (participant) {
              // House Points
              if (ans.pointsAwarded > 0 && questionHousePoints[participant.house] !== undefined) {
                questionHousePoints[participant.house] += ans.pointsAwarded;
              }

              // Collect correct answers for Top 5
              if (ans.isCorrect) {
                // Calculate response time from server-authoritative timestamps
                const timeMs = round.questionStartedAt 
                  ? new Date(ans.createdAt).getTime() - new Date(round.questionStartedAt).getTime()
                  : 0;

                correctAnswersList.push({
                  name: participant.name,
                  usn: participant.usn,
                  house: participant.house,
                  points: ans.pointsAwarded,
                  timeMs: Math.max(0, timeMs),
                  createdAt: new Date(ans.createdAt).getTime() // For sorting
                });
              }
            }
          }

          // Sort by actual response time (createdAt) and take Top 5
          correctAnswersList.sort((a, b) => a.timeMs - b.timeMs);
          fastestAnswers = correctAnswersList.slice(0, 5).map((a, idx) => ({
            rank: idx + 1,
            name: a.name,
            usn: a.usn,
            house: a.house,
            timeMs: a.timeMs,
            points: a.points
          }));
        }
      }
    }

    // --- PROJECTOR DISPLAY RACE DATA ---
    const projectorDisplay = round.projectorDisplay || { mode: "NORMAL", selectedHouse: null };
    let houseRaceData: { house: string; points: number }[] | undefined;
    let houseDetailsData: { name: string; usn: string; score: number }[] | undefined;
    let houseDetailsTotal: number | undefined;
    let individualRaceData: { name: string; usn: string; house: string; score: number }[] | undefined;

    if (projectorDisplay.mode === "HOUSE_RACE" || projectorDisplay.mode === "HOUSE_DETAILS") {
      // Cumulative house scores: aggregate Answer.pointsAwarded grouped by participant house
      const houseAgg = await Answer.aggregate([
        { $match: { round: round.roundNumber, questionNumber: { $lte: round.currentQuestion } } },
        { $lookup: { from: "participants", localField: "participantId", foreignField: "_id", as: "participant" } },
        { $unwind: "$participant" },
        { $group: { _id: "$participant.house", points: { $sum: "$pointsAwarded" } } },
      ]);
      houseRaceData = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"].map(h => ({
        house: h,
        points: houseAgg.find((a: { _id: string; points: number }) => a._id === h)?.points || 0,
      }));

      if (projectorDisplay.mode === "HOUSE_DETAILS" && projectorDisplay.selectedHouse) {
        // All members of the selected house, sorted by cumulative score descending
        const members = await Participant.find({
          round: round.roundNumber,
          house: projectorDisplay.selectedHouse,
        }).sort({ "quizState.score": -1, _id: 1 }).lean();

        houseDetailsData = members.map((m: any) => ({
          name: m.name,
          usn: m.usn,
          score: m.quizState?.score || 0,
        }));
        houseDetailsTotal = houseDetailsData.reduce((sum, m) => sum + m.score, 0);
      }
    }

    if (projectorDisplay.mode === "INDIVIDUAL_RACE") {
      // All participants sorted by cumulative score descending, deterministic tie-breaking
      const participants = await Participant.find({
        round: round.roundNumber,
      }).sort({ "quizState.score": -1, _id: 1 }).lean();

      individualRaceData = participants.map((p: any) => ({
        name: p.name,
        usn: p.usn,
        house: p.house,
        score: p.quizState?.score || 0,
      }));
    }

    return NextResponse.json({
      gameState: round.gameState,
      currentQuestion: round.currentQuestion,
      totalQuestions,
      questionStartedAt: round.questionStartedAt,
      questionEndsAt: round.questionEndsAt,
      questionData,
      counts: round.counts,
      totalParticipants,
      projectorDisplay,
      ...(histogram && { histogram }),
      ...(fastestAnswers && { fastestAnswers }),
      ...(questionHousePoints && { questionHousePoints }),
      ...(houseRaceData && { houseRaceData }),
      ...(houseDetailsData && { houseDetailsData, houseDetailsTotal, houseDetailsHouse: projectorDisplay.selectedHouse }),
      ...(individualRaceData && { individualRaceData }),
    });
  } catch (error) {
    console.error("Projector state error:", error);
    return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  }
}
