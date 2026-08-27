"use client";

import type { HouseName } from "@/lib/models/participant";
import { HOUSES } from "@/lib/houses";
import HouseCrest from "@/components/ui/HouseCrest";

interface HouseRevealProps {
  house: HouseName;
  playerName: string;
  memberCount: number;
  isReturning: boolean;
  onSortAnother: () => void;
}

/**
 * House reveal screen — shown after the sorting animation completes.
 * Displays crest, house name, motto, personalized greeting, and roster count.
 * Preserves original wording and visual hierarchy.
 */
export default function HouseReveal({
  house,
  playerName,
  memberCount,
  isReturning,
  onSortAnother,
}: HouseRevealProps) {
  const h = HOUSES[house];

  return (
    <div className="reveal-enter flex flex-col items-center w-full">
      <p className="eyebrow mb-2.5">
        {isReturning ? "✨ Welcome Back ✨" : "✨ You have been assigned to ✨"}
      </p>

      <HouseCrest house={house} crestSvg={h.crest} className="mb-3.5" />

      <h2
        className="house-name-text m-0 mb-1"
        style={
          {
            "--house-accent": h.accent,
          } as React.CSSProperties
        }
      >
        {h.name}
      </h2>

      <p className="text-parchment-dim italic text-base m-0 mb-4">{h.tag}</p>

      <p className="text-base mb-5">
        {isReturning ? (
          <>
            <span style={{ color: h.accent, fontWeight: 700 }}>{playerName}</span>,
            you are already sorted into{" "}
            <span style={{ color: h.accent, fontWeight: 700 }}>{h.name}</span>.
            Continue your journey.
          </>
        ) : (
          <>
            <span style={{ color: h.accent, fontWeight: 700 }}>{playerName}</span>,
            the Hat has decided — welcome to{" "}
            <span style={{ color: h.accent, fontWeight: 700 }}>{h.name}</span>.
            Your journey begins now.
          </>
        )}
      </p>

      <div className="roster-box mb-5">
        <div className="font-[family-name:var(--font-cinzel)] text-[0.68rem] tracking-[0.15em] uppercase text-parchment-dim mb-2">
          Your house so far
        </div>
        <div className="text-left text-[0.88rem] leading-[1.75] opacity-90">
          {h.name} now has <strong>{memberCount}</strong>{" "}
          member{memberCount === 1 ? "" : "s"}.
        </div>
      </div>

      <button className="btn-ghost" onClick={onSortAnother}>
        Sort the Next Participant
      </button>
    </div>
  );
}
