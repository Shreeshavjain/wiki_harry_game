"use client";

import { useMemo } from "react";
import type { HouseName } from "@/lib/models/participant";
import { HOUSES, HOUSE_ORDER } from "@/lib/houses";

interface HouseRaceProps {
  scores: Record<HouseName, number>;
}

export default function HouseRace({ scores }: HouseRaceProps) {
  // Determine rankings
  const rankedHouses = useMemo(() => {
    return [...HOUSE_ORDER].sort((a, b) => {
      if (scores[b] !== scores[a]) {
        return scores[b] - scores[a];
      }
      // Stable sort by original order if tied
      return HOUSE_ORDER.indexOf(a) - HOUSE_ORDER.indexOf(b);
    });
  }, [scores]);

  // Max score to determine bar width relative to highest score (minimum scale of 10)
  const maxScore = Math.max(10, ...Object.values(scores));

  return (
    <div className="mb-10 mt-6 p-5 bg-black/30 border border-white/5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3">
        <h3 className="font-[family-name:var(--font-cinzel)] text-[1.3rem] tracking-[0.1em] text-gold-bright m-0 [text-shadow:0_0_10px_rgba(201,162,39,0.2)]">
          LIVE HOUSE RACE
        </h3>
        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold tracking-widest bg-red-900/50 text-red-200 border border-red-500/30 uppercase animate-pulse">
          LIVE
        </span>
      </div>
      
      <div className="relative h-[270px] w-full">
        {HOUSE_ORDER.map((house) => {
          const rank = rankedHouses.indexOf(house);
          const score = scores[house] ?? 0;
          const h = HOUSES[house];
          
          // Width percentage for the bar
          const widthPct = Math.max(2, (score / maxScore) * 100);

          return (
            <div
              key={house}
              className="absolute left-0 w-full flex flex-col transition-all duration-700 ease-in-out"
              style={{
                top: `${rank * 68}px`,
                zIndex: 4 - rank, // Highest rank on top
              }}
            >
              <div className="flex justify-between items-end mb-1 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold w-6 flex items-center justify-center drop-shadow-md" style={{ color: h.accent }}>
                    {rank === 0 ? (
                      <span className="text-[1.3rem] leading-none drop-shadow-md">🥇</span>
                    ) : rank === 1 ? (
                      <span className="text-[1.3rem] leading-none drop-shadow-md">🥈</span>
                    ) : rank === 2 ? (
                      <span className="text-[1.3rem] leading-none drop-shadow-md">🥉</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-[1.3rem] h-[1.3rem] rounded-full bg-black/40 border border-[#f2ead2]/30 text-[#f2ead2] text-[0.8rem] font-bold shadow-inner">
                        4
                      </span>
                    )}
                  </span>
                  <span 
                    className="font-[family-name:var(--font-cinzel)] font-bold tracking-[0.15em] text-[1.05rem]"
                    style={{ color: rank === 0 ? h.accent : "#f2ead2" }}
                  >
                    {h.name.toUpperCase()}
                  </span>
                </div>
                <div className="font-bold tabular-nums text-[1.3rem] tracking-tight">
                  {score} <span className="text-[0.7rem] text-parchment-dim font-normal tracking-widest ml-1">PTS</span>
                </div>
              </div>
              <div className="w-full bg-black/60 h-4 rounded-r-md border border-white/10 overflow-hidden shadow-inner">
                <div
                  className="h-full transition-all duration-1000 ease-out rounded-r-sm"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${h.c1}, ${h.c2})`,
                    boxShadow: `0 0 15px ${h.accent}60`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
