"use client";

import { useState, useCallback, useEffect } from "react";
import type { HouseName } from "@/lib/models/participant";
import type { HouseCounts } from "@/lib/models/round";
import { HOUSES, HOUSE_ORDER } from "@/lib/houses";
import StarField from "@/components/effects/StarField";
import ConfettiEffect from "@/components/effects/ConfettiEffect";
import SortingHat from "@/components/sorting/SortingHat";
import SortingTicker from "@/components/sorting/SortingTicker";
import ParticipantForm from "@/components/sorting/ParticipantForm";
import HouseReveal from "@/components/sorting/HouseReveal";
import Link from "next/link";

interface SortingPortalProps {
  initialCounts: HouseCounts;
  initialRound: number;
}

type Phase = "entry" | "sorting" | "reveal";

/**
 * Main Sorting Portal orchestrator.
 * Manages the flow: entry → sorting animation → house reveal.
 */
export default function SortingPortal({
  initialCounts,
  initialRound,
}: SortingPortalProps) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [counts, setCounts] = useState<HouseCounts>(initialCounts);
  const [assignedHouse, setAssignedHouse] = useState<HouseName | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [isSorting, setIsSorting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confettiColors, setConfettiColors] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const totalSorted = HOUSE_ORDER.reduce(
    (sum, h) => sum + (counts[h] ?? 0),
    0
  );

  // Apply house theme to body when in reveal phase
  useEffect(() => {
    if (phase === "reveal" && assignedHouse) {
      const h = HOUSES[assignedHouse];
      document.documentElement.style.setProperty("--house-c1", h.c1);
      document.documentElement.style.setProperty("--house-c2", h.c2);
      document.documentElement.style.setProperty("--house-accent", h.accent);
      document.body.classList.add("revealed");
    } else {
      document.body.classList.remove("revealed");
    }

    return () => {
      document.body.classList.remove("revealed");
    };
  }, [phase, assignedHouse]);

  async function handleSort(name: string, usn: string) {
    setError(null);
    setIsSorting(true);
    setPlayerName(name);
    setPhase("sorting");

    try {
      const res = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, usn }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sorting failed");
      }

      setAssignedHouse(data.house as HouseName);
      setCounts(data.counts);

      if (data.isReturning) {
        setIsReturning(true);
        setPlayerName(data.storedName || name);
        setPhase("reveal");
        setIsSorting(false);
        const h = HOUSES[data.house as HouseName];
        setConfettiColors([h.accent, h.c2, "#ffffff"]);
        setShowConfetti(true);
      }
    } catch (err) {
      setPhase("entry");
      setIsSorting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the sorting system. Please try again."
      );
    }
  }

  const handleTickerComplete = useCallback(() => {
    setPhase("reveal");
    setIsSorting(false);

    if (assignedHouse) {
      const h = HOUSES[assignedHouse];
      setConfettiColors([h.accent, h.c2, "#ffffff"]);
      setShowConfetti(true);
    }
  }, [assignedHouse]);

  function handleSortAnother() {
    setPhase("entry");
    setAssignedHouse(null);
    setPlayerName("");
    setIsReturning(false);
    setShowConfetti(false);
    setConfettiColors([]);
    setError(null);

    // Refresh counts
    fetch("/api/round")
      .then((r) => r.json())
      .then((data) => {
        if (data.counts) setCounts(data.counts);
      })
      .catch(() => {});
  }

  return (
    <div className="relative z-1 min-h-dvh">
      <StarField />
      <ConfettiEffect colors={confettiColors} active={showConfetti} />

      <div className="max-w-[520px] mx-auto w-full min-h-dvh flex flex-col items-center px-5 py-[30px] pb-[26px] text-center">
        {/* Header — hidden during reveal */}
        {phase !== "reveal" && (
          <div
            className="transition-opacity duration-300"
            style={{ opacity: phase === "sorting" ? 0.4 : 1 }}
          >
            <p className="eyebrow my-1 mb-1.5">
              Wiki Tech Club · Open Source Day
            </p>
            <h1 className="font-[family-name:var(--font-cinzel-decorative)] font-black text-[1.85rem] leading-[1.18] m-0 mb-1.5 [text-shadow:0_0_18px_rgba(201,162,39,0.25)]">
              ⚡ Welcome to the Wiki Tech Journey
            </h1>
            <p className="text-parchment-dim text-base m-0 mb-5 max-w-[380px]">
              Before your journey begins, the ancient magic of the Sorting Hat
              must decide which house you belong to.
            </p>
          </div>
        )}

        {/* Sorting Hat */}
        <SortingHat thinking={phase === "sorting"} />

        {/* Ticker — visible during sorting */}
        <SortingTicker
          active={phase === "sorting"}
          targetHouse={assignedHouse}
          onComplete={handleTickerComplete}
        />

        {/* Error message */}
        {error && (
          <div className="text-[#ff8f8f] text-sm mb-4 max-w-[320px]">
            {error}
          </div>
        )}

        {/* Entry form */}
        {phase === "entry" && (
          <ParticipantForm
            onSubmit={handleSort}
            disabled={isSorting}
            totalSorted={totalSorted}
          />
        )}

        {/* House reveal */}
        {phase === "reveal" && assignedHouse && (
          <HouseReveal
            house={assignedHouse}
            playerName={playerName}
            memberCount={counts[assignedHouse] ?? 0}
            isReturning={isReturning}
            onSortAnother={handleSortAnother}
          />
        )}
      </div>

      {/* Admin link */}
      <Link
        href="/admin"
        className="fixed bottom-2 right-2.5 text-[0.68rem] text-parchment/25 z-2 no-underline tracking-[0.05em] font-[family-name:var(--font-cinzel)] hover:text-parchment/40 transition-colors"
      >
        admin
      </Link>
    </div>
  );
}
