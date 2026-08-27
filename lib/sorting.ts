import type { HouseName } from "./models/participant";
import type { HouseCounts } from "./models/round";
import { HOUSE_ORDER } from "./houses";

/**
 * Strict minimum-count house selection algorithm.
 *
 * Guarantees that the maximum difference between any two houses never exceeds 1.
 * Finds the minimum count across all houses, filters the houses that have exactly this minimum count,
 * and randomly selects one of them.
 */
export function pickHouse(counts: HouseCounts): HouseName {
  const countsArray = HOUSE_ORDER.map((h) => counts[h] ?? 0);
  const minCount = Math.min(...countsArray);

  const eligibleHouses = HOUSE_ORDER.filter(
    (h) => (counts[h] ?? 0) === minCount
  );

  // Randomly select from the eligible minimum-count houses
  const randomIndex = Math.floor(Math.random() * eligibleHouses.length);
  return eligibleHouses[randomIndex];
}
