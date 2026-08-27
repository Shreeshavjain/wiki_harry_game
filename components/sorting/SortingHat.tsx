"use client";

import { SORTING_HAT_SVG } from "@/lib/houses";

interface SortingHatProps {
  thinking: boolean;
}

/**
 * The Sorting Hat — original club member SVG artwork.
 * Includes shake animation and golden glow ring when thinking.
 */
export default function SortingHat({ thinking }: SortingHatProps) {
  return (
    <div className={`hat-wrap mx-auto my-1.5 mb-5 ${thinking ? "thinking" : ""}`}>
      <div className="glow-ring" />
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: SORTING_HAT_SVG }}
      />
    </div>
  );
}
