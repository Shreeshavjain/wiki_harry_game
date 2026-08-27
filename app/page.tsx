import { connectDB } from "@/lib/db";
import Round from "@/lib/models/round";
import SortingPortal from "@/components/sorting/SortingPortal";
import type { HouseCounts } from "@/lib/models/round";

/**
 * Landing page — Server Component.
 * Fetches initial round counts and passes them to the client-side SortingPortal.
 */
export default async function Home() {
  let counts: HouseCounts = {
    gryffindor: 0,
    slytherin: 0,
    ravenclaw: 0,
    hufflepuff: 0,
  };
  let roundNumber = 1;

  try {
    await connectDB();
    const round = await Round.findOne({ status: "active" }).lean();

    if (round) {
      counts = {
        gryffindor: round.counts?.gryffindor ?? 0,
        slytherin: round.counts?.slytherin ?? 0,
        ravenclaw: round.counts?.ravenclaw ?? 0,
        hufflepuff: round.counts?.hufflepuff ?? 0,
      };
      roundNumber = round.roundNumber ?? 1;
    }
  } catch (error) {
    // If DB is not available, start with zero counts
    console.error("Failed to load initial counts:", error);
  }

  return <SortingPortal initialCounts={counts} initialRound={roundNumber} />;
}
