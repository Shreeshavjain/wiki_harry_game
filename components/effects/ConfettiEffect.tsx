"use client";

import { useEffect, useRef } from "react";

interface ConfettiEffectProps {
  colors: string[];
  active: boolean;
}

/**
 * Confetti burst effect — launches 70 confetti pieces in the given colors.
 * Preserved from the original celebration moment.
 */
export default function ConfettiEffect({ colors, active }: ConfettiEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active || colors.length === 0) return;

    container.innerHTML = "";

    for (let i = 0; i < 70; i++) {
      const piece = document.createElement("i");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      container.appendChild(piece);
    }

    const timer = setTimeout(() => {
      container.innerHTML = "";
    }, 4200);

    return () => {
      clearTimeout(timer);
      container.innerHTML = "";
    };
  }, [active, colors]);

  return <div ref={containerRef} className="confetti-container" />;
}
