import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import Participant from "@/lib/models/participant";
import Round from "@/lib/models/round";
import { HOUSES, HOUSE_ORDER } from "@/lib/houses";
import type { HouseName } from "@/lib/models/participant";

/**
 * GET /api/admin/export
 *
 * Exports all participants for the current round as a CSV file.
 * Admin-only endpoint.
 */
export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const round = await Round.findOne({ status: "active" });
    if (!round) {
      return new Response("House,Name,USN\n", {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=sorting-round-1.csv",
        },
      });
    }

    const participants = await Participant.find({
      round: round.roundNumber,
    }).sort({ house: 1, createdAt: 1 });

    let csv = "House,Name,USN\n";
    for (const p of participants) {
      const houseName = HOUSES[p.house as HouseName]?.name ?? p.house;
      // Escape double quotes in CSV fields
      const name = p.name.replace(/"/g, '""');
      const usn = p.usn.replace(/"/g, '""');
      csv += `${houseName},"${name}","${usn}"\n`;
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=sorting-round-${round.roundNumber}.csv`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Unable to export data" },
      { status: 500 }
    );
  }
}
