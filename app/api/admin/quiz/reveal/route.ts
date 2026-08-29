import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Round from "@/lib/models/round";
import { isAdminAuthenticated } from "@/lib/auth";

export async function POST() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "No active round found" }, { status: 404 });
    }

    if (round.gameState !== "TIME_UP") {
      return NextResponse.json(
        { error: "Invalid state transition. Can only reveal answer from TIME_UP state." },
        { status: 400 }
      );
    }

    const updatedRound = await Round.findOneAndUpdate(
      { _id: round._id, gameState: "TIME_UP" },
      { gameState: "REVEAL" },
      { new: true }
    );

    if (!updatedRound) {
       return NextResponse.json(
         { error: "Failed to transition state. Game state might have changed." },
         { status: 409 }
       );
    }

    return NextResponse.json({ success: true, message: "Answer revealed" });
  } catch (error) {
    console.error("Reveal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
