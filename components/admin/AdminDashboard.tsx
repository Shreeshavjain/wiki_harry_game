"use client";

import { useState, useEffect, useCallback } from "react";
import type { HouseName } from "@/lib/models/participant";
import type { HouseCounts } from "@/lib/models/round";
import { HOUSE_ORDER } from "@/lib/houses";
import HouseTile from "@/components/admin/HouseTile";
import ParticipantTable from "@/components/admin/ParticipantTable";
import QRGenerator from "@/components/admin/QRGenerator";
import ResetModal from "@/components/admin/ResetModal";
import Link from "next/link";

interface Participant {
  name: string;
  usn: string;
}

type ParticipantsByHouse = Record<HouseName, Participant[]>;

/**
 * Admin Dashboard — shows house stats, participant tables,
 * search, export, refresh, round reset, and QR generation.
 */
export default function AdminDashboard() {
  const [roundNumber, setRoundNumber] = useState(1);
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const totalCount = HOUSE_ORDER.reduce((sum, h) => sum + (counts[h] ?? 0), 0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/participants");

      if (res.status === 401) {
        // Session expired — reload page to show login
        window.location.reload();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load data");
      }

      setRoundNumber(data.roundNumber ?? 1);
      setCounts(data.counts ?? { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 });
      setParticipants(
        data.participants ?? {
          gryffindor: [],
          slytherin: [],
          ravenclaw: [],
          hufflepuff: [],
        }
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load roster. Please refresh."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/round/reset", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Reset failed");
      }

      setShowResetModal(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to start new round.");
    } finally {
      setResetting(false);
    }
  }

  function handleExport() {
    window.open("/api/admin/export", "_blank");
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  // Filter participants by search query
  function getFilteredParticipants(house: HouseName): Participant[] {
    const list = participants[house] ?? [];
    if (!search.trim()) return list;

    const q = search.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.usn.toLowerCase().includes(q)
    );
  }

  return (
    <div className="max-w-[920px] mx-auto w-full px-4 py-6 pb-15">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 mb-5">
        <h2 className="font-[family-name:var(--font-cinzel)] text-[1.15rem] tracking-[0.05em] m-0">
          🗝️ Sorting Portal — Admin Dashboard
        </h2>
        <div className="flex gap-3 items-center">
          <Link
            href="/"
            className="text-parchment-dim text-[0.82rem] no-underline hover:text-parchment transition-colors"
          >
            ← Back to Sorting Portal
          </Link>
          <button
            className="small-btn text-[0.68rem]"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {loading && !error && (
        <p className="text-parchment-dim text-[0.85rem] opacity-60">
          Loading roster…
        </p>
      )}

      {error && (
        <p className="text-[#ff8f8f] text-[0.85rem]">{error}</p>
      )}

      {!loading && !error && (
        <>
          {/* House tiles */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mb-5">
            {HOUSE_ORDER.map((h) => (
              <HouseTile key={h} house={h} count={counts[h] ?? 0} />
            ))}
          </div>

          <p className="text-[0.85rem] text-parchment-dim -mt-2.5 mb-5">
            Total sorted:{" "}
            <strong className="text-gold-bright">{totalCount}</strong> · Round{" "}
            <span>{roundNumber}</span>
          </p>

          {/* Toolbar */}
          <div className="flex gap-2.5 flex-wrap mb-4 items-center">
            <input
              type="text"
              className="magic-input text-left max-w-[220px] !py-2.5 !px-3 !text-[0.92rem] m-0"
              placeholder="Search name or USN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="searchInput"
            />
            <button className="small-btn" onClick={handleExport}>
              ⬇ Export CSV
            </button>
            <button className="small-btn" onClick={loadData}>
              ↻ Refresh
            </button>
            <button
              className="small-btn danger"
              onClick={() => setShowResetModal(true)}
            >
              ⟲ New Round (reset all)
            </button>
          </div>

          {/* Participant tables */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {HOUSE_ORDER.map((h) => (
              <ParticipantTable
                key={h}
                house={h}
                participants={getFilteredParticipants(h)}
                count={counts[h] ?? 0}
              />
            ))}
          </div>

          {/* QR Generator */}
          <QRGenerator />
        </>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <ResetModal
          onConfirm={handleReset}
          onCancel={() => setShowResetModal(false)}
          loading={resetting}
        />
      )}
    </div>
  );
}
