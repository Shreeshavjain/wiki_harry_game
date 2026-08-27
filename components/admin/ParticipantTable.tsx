"use client";

import type { HouseName } from "@/lib/models/participant";
import { HOUSES } from "@/lib/houses";

interface Participant {
  name: string;
  usn: string;
  score: number;
}

interface ParticipantTableProps {
  house: HouseName;
  participants: Participant[];
  count: number;
  score: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * House participant table for the admin dashboard.
 * Scrollable body, matches original table styling.
 */
import { useState } from "react";

export default function ParticipantTable({
  house,
  participants,
  count,
  score,
}: ParticipantTableProps) {
  const h = HOUSES[house];
  const isHufflepuff = house === "hufflepuff";
  const [expanded, setExpanded] = useState(false);

  // Sort participants by score (desc), then by name (asc)
  const sortedParticipants = [...participants].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="admin-table border border-white/10 rounded-md overflow-hidden bg-black/40 backdrop-blur-md mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full m-0 py-3 px-4 font-[family-name:var(--font-cinzel)] text-[0.85rem] tracking-[0.06em] flex justify-between items-center transition-opacity hover:opacity-90"
        style={{
          background: h.c2,
          color: isHufflepuff ? "#2a2015" : "#f2ead2",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{expanded ? "▼" : "▶"}</span>
          <span>{h.name.toUpperCase()} — {score} PTS</span>
        </div>
        <span className="opacity-70 text-[0.75rem]">{count} Participants</span>
      </button>

      {expanded && (
      <table>
        <thead>
          <tr>
            <th style={{ width: "40px" }}>#</th>
            <th>Player</th>
            <th>USN</th>
            <th className="text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {sortedParticipants.length > 0 ? (
            sortedParticipants.map((p, i) => (
              <tr key={`${p.usn}-${i}`}>
                <td>{i + 1}</td>
                <td className="font-bold" style={{ color: h.accent }}>{p.name}</td>
                <td className="text-parchment-dim tabular-nums">{p.usn}</td>
                <td className="text-right font-bold tabular-nums text-gold-bright">{p.score}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="opacity-50 text-center py-4">
                No entries
              </td>
            </tr>
          )}
        </tbody>
      </table>
      )}
    </div>
  );
}
