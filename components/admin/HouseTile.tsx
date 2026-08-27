"use client";

import type { HouseName } from "@/lib/models/participant";
import { HOUSES } from "@/lib/houses";

interface HouseTileProps {
  house: HouseName;
  count: number;
}

/**
 * Single house stat tile for the admin dashboard.
 * Matches the original tile design with house-specific gradient.
 */
export default function HouseTile({ house, count }: HouseTileProps) {
  const h = HOUSES[house];
  const isHufflepuff = house === "hufflepuff";

  return (
    <div
      className="admin-tile"
      style={{
        background: `linear-gradient(160deg, ${h.c1}, ${h.c2})`,
        color: isHufflepuff ? "#2a2015" : "#f2ead2",
      }}
    >
      <div className="tile-count">{count}</div>
      <div className="tile-label">{h.name}</div>
    </div>
  );
}
