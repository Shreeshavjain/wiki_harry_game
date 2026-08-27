"use client";

import { useEffect, useRef, useState } from "react";
import type { HouseName } from "@/lib/models/participant";
import { HOUSES, HOUSE_ORDER } from "@/lib/houses";

interface SortingTickerProps {
  active: boolean;
  targetHouse: HouseName | null;
  onComplete: () => void;
}

/**
 * House name cycling animation — the signature sorting UX.
 *
 * Cycles through random house names with increasing delay (deceleration),
 * then lands on the target house. Total ~16 random steps + final reveal.
 * Matches the original animation timing.
 */
export default function SortingTicker({
  active,
  targetHouse,
  onComplete,
}: SortingTickerProps) {
  const [currentHouse, setCurrentHouse] = useState<HouseName | null>(null);
  const [visible, setVisible] = useState(false);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!active || !targetHouse || animatingRef.current) return;

    animatingRef.current = true;
    setVisible(true);

    const totalSteps = 16;
    const sequence: HouseName[] = [];

    // Generate random sequence
    for (let i = 0; i < totalSteps; i++) {
      sequence.push(HOUSE_ORDER[Math.floor(Math.random() * HOUSE_ORDER.length)]);
    }
    // Final step is always the target house
    sequence.push(targetHouse);

    let step = 0;

    function tick() {
      const house = sequence[step];
      setCurrentHouse(house);
      step++;

      if (step < sequence.length) {
        // Deceleration: delay increases quadratically
        const delay = 70 + Math.pow(step / totalSteps, 2.2) * 280;
        setTimeout(tick, delay);
      } else {
        // Animation complete
        setTimeout(() => {
          setVisible(false);
          animatingRef.current = false;
          onComplete();
        }, 300);
      }
    }

    tick();
  }, [active, targetHouse, onComplete]);

  // Reset when not active
  useEffect(() => {
    if (!active) {
      setVisible(false);
      setCurrentHouse(null);
      animatingRef.current = false;
    }
  }, [active]);

  if (!currentHouse) return <div className="h-[40px] mb-2" />;

  const house = HOUSES[currentHouse];

  return (
    <div className="flex flex-col items-center mb-5">
      <div
        className={`sorting-ticker ${visible ? "visible" : ""}`}
        style={{ color: house.accent }}
      >
        {house.name}
      </div>
      <div className={`sorting-flavor ${visible ? "visible" : ""}`}>
        {house.flavor}
      </div>
    </div>
  );
}
