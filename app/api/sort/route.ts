import { NextResponse } from "next/server";
import { connectDB, startSession } from "@/lib/db";
import Participant from "@/lib/models/participant";
import Round from "@/lib/models/round";
import { pickHouse } from "@/lib/sorting";
import { validateParticipantInput } from "@/lib/validation";
import { HOUSES, HOUSE_ORDER } from "@/lib/houses";
import type { HouseName } from "@/lib/models/participant";

/**
 * POST /api/sort
 *
 * Assigns a participant to a house using a MongoDB transaction.
 * The transaction guarantees:
 *   1. Duplicate USN check
 *   2. Fresh count read
 *   3. House selection
 *   4. Participant creation
 *   5. Count increment
 * ...all happen atomically.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, usn } = body;

    // Validate input
    const validation = validateParticipantInput(name, usn);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const { name: cleanName, usn: cleanUsn } = validation.sanitized!;

    await connectDB();

    // Get or create the active round
    let activeRound = await Round.findOne({ status: "active" });
    if (!activeRound) {
      activeRound = await Round.create({
        roundNumber: 1,
        status: "active",
        counts: { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 },
      });
    }

    const roundNumber = activeRound.roundNumber;

    // Check for existing participant (before transaction — fast path)
    const existing = await Participant.findOne({
      usn: cleanUsn,
      round: roundNumber,
    });

    if (existing) {
      const house = existing.house as HouseName;
      return NextResponse.json({
        house,
        houseName: HOUSES[house].name,
        houseTag: HOUSES[house].tag,
        counts: activeRound.counts,
        isReturning: true,
        storedName: existing.name,
        message: `Welcome back, ${existing.name}!`,
      });
    }

    // Start a MongoDB transaction for atomic assignment
    const session = await startSession();
    let result: {
      house: HouseName;
      counts: Record<HouseName, number>;
    };

    try {
      result = await session.withTransaction(async () => {
        // Re-check for duplicate inside transaction (concurrent protection)
        const dupeCheck = await Participant.findOne({
          usn: cleanUsn,
          round: roundNumber,
        }).session(session);

        if (dupeCheck) {
          // Another request just created this participant
          throw new DuplicateError(dupeCheck.house as HouseName);
        }

        // Read fresh counts inside transaction
        const round = await Round.findOne({
          _id: activeRound._id,
        }).session(session);

        if (!round) {
          throw new Error("Round not found");
        }

        const currentCounts = {
          gryffindor: round.counts.gryffindor ?? 0,
          slytherin: round.counts.slytherin ?? 0,
          ravenclaw: round.counts.ravenclaw ?? 0,
          hufflepuff: round.counts.hufflepuff ?? 0,
        };

        // Pick house using weighted random algorithm
        const chosenHouse = pickHouse(currentCounts);

        // Create participant
        await Participant.create(
          [
            {
              name: cleanName,
              usn: cleanUsn,
              house: chosenHouse,
              round: roundNumber,
            },
          ],
          { session }
        );

        // Increment count
        const updatedRound = await Round.findOneAndUpdate(
          { _id: activeRound._id },
          { $inc: { [`counts.${chosenHouse}`]: 1 } },
          { new: true, session }
        );

        return {
          house: chosenHouse,
          counts: {
            gryffindor: updatedRound!.counts.gryffindor,
            slytherin: updatedRound!.counts.slytherin,
            ravenclaw: updatedRound!.counts.ravenclaw,
            hufflepuff: updatedRound!.counts.hufflepuff,
          },
        };
      });
    } catch (err) {
      if (err instanceof DuplicateError) {
        // Concurrent duplicate — return existing house
        const existingDoc = await Participant.findOne({
          usn: cleanUsn,
          round: roundNumber,
        });
        const latestRound = await Round.findOne({ _id: activeRound._id });

        const house = (existingDoc?.house ?? err.house) as HouseName;
        return NextResponse.json({
          house,
          houseName: HOUSES[house].name,
          houseTag: HOUSES[house].tag,
          counts: latestRound?.counts ?? activeRound.counts,
          isReturning: true,
          storedName: existingDoc?.name ?? cleanName,
          message: `Welcome back, ${existingDoc?.name ?? cleanName}!`,
        });
      }
      throw err;
    } finally {
      await session.endSession();
    }

    const house = result.house;
    return NextResponse.json({
      house,
      houseName: HOUSES[house].name,
      houseTag: HOUSES[house].tag,
      counts: result.counts,
      isReturning: false,
      storedName: cleanName,
      message: `Welcome to ${HOUSES[house].name}!`,
    });
  } catch (error) {
    console.error("Sort error:", error);
    return NextResponse.json(
      { error: "Unable to complete sorting. Please try again." },
      { status: 500 }
    );
  }
}

/** Custom error for duplicate USN handling within transactions */
class DuplicateError extends Error {
  house: HouseName;
  constructor(house: HouseName) {
    super("Duplicate USN");
    this.house = house;
  }
}
