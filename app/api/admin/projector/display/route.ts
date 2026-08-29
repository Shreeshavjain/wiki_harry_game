import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Round from "@/lib/models/round";

const VALID_MODES = ["NORMAL", "HOUSE_RACE", "HOUSE_DETAILS", "INDIVIDUAL_RACE"] as const;
const VALID_HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"] as const;

export async function POST(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { mode, selectedHouse } = body;

    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` },
        { status: 400 }
      );
    }

    // HOUSE_DETAILS requires a selectedHouse
    if (mode === "HOUSE_DETAILS") {
      if (!selectedHouse || !VALID_HOUSES.includes(selectedHouse)) {
        return NextResponse.json(
          { error: "HOUSE_DETAILS mode requires a valid selectedHouse." },
          { status: 400 }
        );
      }
    }

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return NextResponse.json({ error: "No active round found" }, { status: 404 });
    }

    // Build the update
    const displayUpdate: { mode: string; selectedHouse: string | null } = {
      mode,
      selectedHouse: mode === "HOUSE_DETAILS" ? selectedHouse : null,
    };

    const updatedRound = await Round.findOneAndUpdate(
      { _id: round._id },
      { $set: { projectorDisplay: displayUpdate } },
      { new: true }
    );

    if (!updatedRound) {
      return NextResponse.json(
        { error: "Failed to update projector display." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      projectorDisplay: updatedRound.projectorDisplay,
    });
  } catch (error) {
    console.error("Projector display error:", error);
    return NextResponse.json({ error: "Failed to update projector display" }, { status: 500 });
  }
}
