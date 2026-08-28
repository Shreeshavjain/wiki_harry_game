"use client";

import { useState, useEffect, useCallback } from "react";
import type { HouseName } from "@/lib/models/participant";
import type { HouseCounts } from "@/lib/models/round";
import { HOUSE_ORDER } from "@/lib/houses";
import HouseTile from "@/components/admin/HouseTile";
import ParticipantTable from "@/components/admin/ParticipantTable";
import HouseRace from "@/components/admin/HouseRace";

interface Participant {
  name: string;
  usn: string;
  score: number;
}

type ParticipantsByHouse = Record<HouseName, Participant[]>;

interface LiveScoreboardProps {
  searchQuery: string;
}

export default function LiveScoreboard({ searchQuery }: LiveScoreboardProps) {
  const [counts, setCounts] = useState<HouseCounts>({
    gryffindor: 0,
    slytherin: 0,
    ravenclaw: 0,
    hufflepuff: 0,
  });
  const [participants, setParticipants] = useState<ParticipantsByHouse>({
    gryffindor: [],
    slytherin: [],
    ravenclaw: [],
    hufflepuff: [],
  });
  const [houseScores, setHouseScores] = useState<Record<HouseName, number>>({
    gryffindor: 0,
    slytherin: 0,
    ravenclaw: 0,
    hufflepuff: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const url = new URL("/api/admin/participants", window.location.origin);
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      
      setCounts(data.counts ?? { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 });
      setParticipants(
        data.participants ?? {
          gryffindor: [],
          slytherin: [],
          ravenclaw: [],
          hufflepuff: [],
        }
      );
      setHouseScores(
        data.houseScores ?? {
          gryffindor: 0,
          slytherin: 0,
          ravenclaw: 0,
          hufflepuff: 0,
        }
      );
    } catch (err) {
      // Ignore background fetch errors
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalCount = HOUSE_ORDER.reduce((sum, h) => sum + (counts[h] ?? 0), 0);

  function getFilteredParticipants(house: HouseName): Participant[] {
    return participants[house] ?? [];
  }

  return (
    <>
      {/* Section 1: House Participant Counts */}
      <div className="mb-8">
        <h3 className="font-[family-name:var(--font-cinzel)] text-[0.9rem] tracking-[0.15em] text-parchment-dim uppercase mb-3">
          Participant Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HOUSE_ORDER.map((h) => (
            <HouseTile key={h} house={h} count={counts[h] ?? 0} />
          ))}
        </div>
        <p className="text-[0.75rem] text-parchment-dim mt-2 text-right tracking-wider uppercase">
          Total Participants: <strong className="text-gold-bright">{totalCount}</strong>
        </p>
      </div>

      {/* Section 2: Live House Race */}
      <HouseRace scores={houseScores} />

      {/* Participant tables */}
      <div className="grid grid-cols-1 gap-1">
        {HOUSE_ORDER.map((h) => (
          <ParticipantTable
            key={h}
            house={h}
            participants={getFilteredParticipants(h)}
            count={counts[h] ?? 0}
            score={houseScores[h] ?? 0}
          />
        ))}
      </div>
    </>
  );
}
