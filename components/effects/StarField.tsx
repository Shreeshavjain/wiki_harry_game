"use client";

import { useEffect, useRef } from "react";

/**
 * Twinkling starfield background — 45 randomly placed stars.
 * Preserved from the original design.
 */
export default function StarField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Generate 45 stars with random positions and animation delays
    for (let i = 0; i < 45; i++) {
      const star = document.createElement("span");
      star.className = "star";
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3.5}s`;
      container.appendChild(star);
    }

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return <div ref={containerRef} className="stars-container" />;
}
