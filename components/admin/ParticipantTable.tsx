"use client";

import type { HouseName } from "@/lib/models/participant";
import { HOUSES } from "@/lib/houses";

interface Participant {
  name: string;
  usn: string;
}

interface ParticipantTableProps {
  house: HouseName;
  participants: Participant[];
  count: number;
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
export default function ParticipantTable({
  house,
  participants,
  count,
}: ParticipantTableProps) {
  const h = HOUSES[house];
  const isHufflepuff = house === "hufflepuff";

  return (
    <div className="admin-table">
      <h3
        className="m-0 py-2.5 px-3.5 font-[family-name:var(--font-cinzel)] text-[0.82rem] tracking-[0.06em]"
        style={{
          background: h.c2,
          color: isHufflepuff ? "#2a2015" : "#f2ead2",
        }}
      >
        {h.name} — {count}
      </h3>
      <table>
        <thead>
          <tr>
            <th style={{ width: "30px" }}>#</th>
            <th>Name</th>
            <th>USN</th>
          </tr>
        </thead>
        <tbody>
          {participants.length > 0 ? (
            participants.map((p, i) => (
              <tr key={`${p.usn}-${i}`}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td className="text-parchment-dim tabular-nums">{p.usn}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="opacity-50">
                No entries
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
