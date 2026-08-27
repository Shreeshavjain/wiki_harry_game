import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";

/**
 * POST /api/admin/round/reset
 *
 * Marks the current round as completed and creates a new active round.
 * Admin-only endpoint.
 */
export async function POST() {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Mark current active round as completed
    const currentRound = await Round.findOne({ status: "active" });
    const nextRoundNumber = currentRound
      ? currentRound.roundNumber + 1
      : 1;

    if (currentRound) {
      currentRound.status = "completed";
      await currentRound.save();
    }

    // Create new active round
    const newRound = await Round.create({
      roundNumber: nextRoundNumber,
      status: "active",
      counts: { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 },
    });

    return NextResponse.json({
      success: true,
      roundNumber: newRound.roundNumber,
      message: `Round ${newRound.roundNumber} started successfully`,
    });
  } catch (error) {
    console.error("Round reset error:", error);
    return NextResponse.json(
      { error: "Unable to start new round" },
      { status: 500 }
    );
  }
}
