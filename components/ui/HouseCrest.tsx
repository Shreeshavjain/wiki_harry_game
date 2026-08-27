"use client";

import type { HouseName } from "@/lib/models/participant";

interface HouseCrestProps {
  house: HouseName;
  crestSvg: string;
  className?: string;
}

/**
 * SVG house crest — renders the original club member artwork for any house.
 */
export default function HouseCrest({ crestSvg, className = "" }: HouseCrestProps) {
  return (
    <svg
      className={`house-crest ${className}`}
      viewBox="0 0 120 120"
      dangerouslySetInnerHTML={{ __html: crestSvg }}
    />
  );
}
