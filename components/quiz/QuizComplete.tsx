"use client";

import type { HouseName } from "@/lib/models/participant";
import { HOUSES } from "@/lib/houses";
import HouseCrest from "@/components/ui/HouseCrest";
import Link from "next/link";

interface QuizCompleteProps {
  score: number;
  house: HouseName;
}

export default function QuizComplete({ score, house }: QuizCompleteProps) {
  const h = HOUSES[house];

  return (
    <div className="glass-surface max-w-lg w-full p-10 text-center animate-fade-in flex flex-col items-center relative overflow-hidden">
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-white/20 opacity-50 rounded-tl-xl" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-white/20 opacity-50 rounded-br-xl" />

      <h2 className="display-text text-3xl sm:text-4xl tracking-[0.2em] text-gold-bright m-0 mb-8 drop-shadow-[0_0_15px_rgba(201,162,39,0.4)]">
        QUIZ COMPLETE
      </h2>

      <div className="relative">
         <div className="absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse" style={{ backgroundColor: h.c2 }} />
         <HouseCrest house={house} crestSvg={h.crest} className="mb-6 w-32 h-32 relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" />
      </div>

      <div className="mb-10 w-full">
        <p className="text-parchment-dim uppercase tracking-[0.3em] text-[0.65rem] m-0 mb-2 body-text">
          Final Score
        </p>
        <p className="text-6xl sm:text-7xl font-light data-text m-0 drop-shadow-md" style={{ color: h.accent }}>
          {score} <span className="text-2xl text-parchment-dim ml-1 opacity-80 tracking-widest uppercase body-text">PTS</span>
        </p>
      </div>

      <div className="mb-10 p-5 rounded-xl bg-[rgba(8,11,20,0.5)] border border-white/5 w-full shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, transparent, ${h.accent}, transparent)` }} />
        <p className="text-sm sm:text-base text-parchment-dim body-text m-0 leading-relaxed relative z-10">
          Your points have been contributed to{" "}
          <strong className="tracking-wider uppercase" style={{ color: h.accent, textShadow: `0 0 10px ${h.accent}` }}>{h.name}</strong>.
          <br/>
          <span className="opacity-80 text-xs mt-2 block">Look at the main screen to see the final results!</span>
        </p>
      </div>

      <Link href="/" className="btn-ghost w-full py-4 text-sm no-underline flex items-center justify-center tracking-[0.2em]">
        RETURN TO GREAT HALL
      </Link>
    </div>
  );
}
