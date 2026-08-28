"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { HouseName } from "@/lib/models/participant";
import type { HouseCounts } from "@/lib/models/round";
import { HOUSE_ORDER } from "@/lib/houses";
import HouseTile from "@/components/admin/HouseTile";
import ParticipantTable from "@/components/admin/ParticipantTable";
import ResetModal from "@/components/admin/ResetModal";
import Link from "next/link";
import GameStatus from "@/components/admin/GameStatus";
import LiveScoreboard from "@/components/admin/LiveScoreboard";

/**
 * Admin Dashboard — shows house stats, participant tables,
 * search, export, refresh, round reset, and QR generation.
 */
export default function AdminDashboard() {
  const [roundNumber, setRoundNumber] = useState(1);
  const [gameState, setGameState] = useState("WAITING");
  const [questionCount, setQuestionCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setGameState(data.gameState ?? "WAITING");
      setQuestionCount(data.questionCount ?? 0);
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
      // Wait a moment then load to allow server state to fully commit
      setTimeout(() => loadData(), 500);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Are you sure you want to upload these questions? This will replace any existing questions for this round.")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/questions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload questions");
      }

      alert(data.message);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleStartQuiz() {
    if (!confirm("Are you sure you want to START THE QUIZ? This action cannot be undone.")) return;
    
    setStarting(true);
    try {
      const res = await fetch("/api/admin/quiz/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start quiz");
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Start failed");
    } finally {
      setStarting(false);
    }
  }

  async function handlePauseQuiz() {
    try {
      const res = await fetch("/api/admin/quiz/pause", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to pause quiz");
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Pause failed");
    }
  }

  async function handleResumeQuiz() {
    try {
      const res = await fetch("/api/admin/quiz/resume", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resume quiz");
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Resume failed");
    }
  }

  async function handleRestartQuiz() {
    if (!confirm("RESTART QUIZ?\n\nThis will restart the current quiz.\nParticipants and House assignments will remain unchanged.\nQuiz scores and progress will be reset.\nQuestion 1 will start again.")) return;
    
    try {
      const res = await fetch("/api/admin/quiz/restart", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restart quiz");
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Restart failed");
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto w-full px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 mb-6 border-b border-white/10 pb-4">
        <h2 className="font-[family-name:var(--font-cinzel)] text-[1.4rem] tracking-[0.1em] text-gold-bright m-0">
          CONTROL ROOM
        </h2>
        <div className="flex gap-3 items-center">
          <Link
            href="/"
            className="text-parchment-dim text-[0.82rem] no-underline hover:text-parchment transition-colors"
          >
            ← Back to Portal
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
        <div className="flex items-center justify-center py-20">
          <p className="text-parchment-dim text-[0.95rem] opacity-70 animate-pulse font-[family-name:var(--font-cinzel)] tracking-widest">
            Loading Control Room Data…
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-[#ff8f8f] text-[0.9rem] m-0">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Section 3: Game Status */}
          <GameStatus 
            roundNumber={roundNumber} 
            gameState={gameState} 
            questionCount={questionCount} 
          />

          {/* Section 4: Individual Player Contribution */}
          <div className="mb-8">
            <h3 className="font-[family-name:var(--font-cinzel)] text-[1.1rem] tracking-[0.1em] text-gold-dim mb-4 border-b border-white/5 pb-2">
              PLAYER CONTRIBUTION
            </h3>
            
            {/* Section 5: Admin Controls Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
              <input
                type="text"
                className="magic-input text-left w-full sm:max-w-[280px] !py-2 !px-3 !text-[0.85rem] m-0"
                placeholder="Search participant name or USN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="searchInput"
              />
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar items-center">
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
                <button 
                  className="small-btn whitespace-nowrap bg-blue-900/50 border-blue-500/50 hover:bg-blue-800/80" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || gameState === "LIVE" || gameState === "COMPLETED" || gameState === "PAUSED"}
                >
                  {uploading ? "Uploading..." : "⬆ UPLOAD QUESTIONS"}
                </button>
                {gameState === "PAUSED" ? (
                  <>
                    <button 
                      className="small-btn whitespace-nowrap bg-[#39ff14]/20 border-[#39ff14]/50 text-[#39ff14] hover:bg-[#39ff14]/40 font-bold" 
                      onClick={handleResumeQuiz}
                    >
                      ▶ RESUME QUIZ
                    </button>
                    <button 
                      className="small-btn danger whitespace-nowrap" 
                      onClick={handleRestartQuiz}
                    >
                      ↺ RESTART QUIZ
                    </button>
                  </>
                ) : gameState === "LIVE" ? (
                  <>
                    <button 
                      className="small-btn whitespace-nowrap bg-orange-900/50 border-orange-500/50 text-orange-400 hover:bg-orange-800/80 font-bold" 
                      onClick={handlePauseQuiz}
                    >
                      ⏸ PAUSE QUIZ
                    </button>
                    <button 
                      className="small-btn danger whitespace-nowrap" 
                      onClick={handleRestartQuiz}
                    >
                      ↺ RESTART QUIZ
                    </button>
                  </>
                ) : (
                  <button 
                    className="small-btn whitespace-nowrap bg-[#39ff14]/20 border-[#39ff14]/50 text-[#39ff14] hover:bg-[#39ff14]/40 font-bold" 
                    onClick={handleStartQuiz}
                    disabled={starting || (gameState !== "QUESTIONS_READY" && gameState !== "RESTARTED")}
                  >
                    {starting ? "..." : "▶ START QUIZ"}
                  </button>
                )}
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <button className="small-btn whitespace-nowrap" onClick={loadData}>
                  ↻
                </button>
                <button className="small-btn whitespace-nowrap" onClick={handleExport}>
                  ⬇ CSV
                </button>
                <button
                  className="small-btn danger whitespace-nowrap"
                  onClick={() => setShowResetModal(true)}
                >
                  ⟲ New Round
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <LiveScoreboard searchQuery={search} />
            </div>
          </div>
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
