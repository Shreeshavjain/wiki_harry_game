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

export default function AdminDashboard() {
  // Static/Heavy Data (participants, scores, general round info)
  const [roundNumber, setRoundNumber] = useState(1);
  const [gameState, setGameState] = useState("WAITING");
  const [questionCount, setQuestionCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals / Action States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Game State (polled frequently for timer/question)
  const [adminQuizState, setAdminQuizState] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/participants");
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");

      setRoundNumber(data.roundNumber ?? 1);
      setGameState(data.gameState ?? "WAITING");
      setQuestionCount(data.questionCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load roster. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminQuizState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quiz/state");
      if (res.ok) {
        const data = await res.json();
        setAdminQuizState(data);
        
        // Update the main gameState to keep things somewhat synced without heavy participant fetch
        if (data.gameState) {
           setGameState(data.gameState);
        }
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    loadData();
    fetchAdminQuizState();
  }, [loadData, fetchAdminQuizState]);

  // Polling for live quiz state
  useEffect(() => {
    const interval = setInterval(fetchAdminQuizState, 1000);
    return () => clearInterval(interval);
  }, [fetchAdminQuizState]);

  // Handle local timer calculation based on server's questionEndsAt
  useEffect(() => {
    const updateTimer = () => {
      if (!adminQuizState?.questionEndsAt) {
        setTimeLeft(0);
        return;
      }
      if (adminQuizState.gameState === "PAUSED") {
        setTimeLeft(0); // PAUSED timer freezing not fully implemented in admin yet, 0 is safe
        return;
      }
      
      const now = new Date().getTime();
      const end = new Date(adminQuizState.questionEndsAt).getTime();
      const start = adminQuizState.questionStartedAt ? new Date(adminQuizState.questionStartedAt).getTime() : 0;
      
      if (now < start) {
         // Countdown to start
         setTimeLeft(Math.ceil((start - now) / 1000));
      } else {
         const remaining = Math.max(0, Math.ceil((end - now) / 1000));
         setTimeLeft(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [adminQuizState]);

  // --- ACTIONS ---

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/round/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setShowResetModal(false);
      setTimeout(() => { loadData(); fetchAdminQuizState(); }, 500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to start new round.");
    } finally {
      setResetting(false);
    }
  }

  function handleExport() { window.open("/api/admin/export", "_blank"); }
  async function handleLogout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.reload(); }

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
      const res = await fetch("/api/admin/questions/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload questions");
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
    if (!confirm("Are you sure you want to START THE QUIZ?")) return;
    setStarting(true);
    try {
      const res = await fetch("/api/admin/quiz/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start quiz");
      await loadData();
      await fetchAdminQuizState();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Start failed");
    } finally {
      setStarting(false);
    }
  }

  async function handlePauseQuiz() {
    try {
      const res = await fetch("/api/admin/quiz/pause", { method: "POST" });
      if (!res.ok) throw new Error("Failed to pause quiz");
      await loadData();
      await fetchAdminQuizState();
    } catch (err: any) { alert(err.message); }
  }

  async function handleResumeQuiz() {
    try {
      const res = await fetch("/api/admin/quiz/resume", { method: "POST" });
      if (!res.ok) throw new Error("Failed to resume quiz");
      await loadData();
      await fetchAdminQuizState();
    } catch (err: any) { alert(err.message); }
  }

  async function handleRestartQuiz() {
    if (!confirm("RESTART QUIZ?\n\nThis will restart the current quiz.\nParticipants and House assignments will remain unchanged.\nQuiz scores and progress will be reset.\nQuestion 1 will start again.")) return;
    try {
      const res = await fetch("/api/admin/quiz/restart", { method: "POST" });
      if (!res.ok) throw new Error("Failed to restart quiz");
      await loadData();
      await fetchAdminQuizState();
    } catch (err: any) { alert(err.message); }
  }

  async function handleRevealAnswer() {
    if (revealing) return;
    setRevealing(true);
    try {
      const res = await fetch("/api/admin/quiz/reveal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reveal answer");
      }
      await loadData();
      await fetchAdminQuizState();
    } catch (err: any) { alert(err.message); }
    finally {
      setRevealing(false);
    }
  }

  async function handleNextQuestion() {
    if (advancing) return;
    setAdvancing(true);
    try {
      const res = await fetch("/api/admin/quiz/next", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to proceed to next question");
      }
      await loadData();
      await fetchAdminQuizState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdvancing(false);
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
          <Link href="/" className="text-parchment-dim text-[0.82rem] no-underline hover:text-parchment transition-colors">
            ← Back to Portal
          </Link>
          <button className="small-btn text-[0.68rem]" onClick={handleLogout}>Logout</button>
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
          {/* SECTION A: ROUND / GAME STATUS */}
          <GameStatus 
            roundNumber={roundNumber} 
            gameState={gameState} 
            questionCount={questionCount} 
          />

          {/* SECTION B: CURRENT QUESTION CONTROL */}
          {adminQuizState?.questionData && (gameState === "LIVE" || gameState === "TIME_UP" || gameState === "REVEAL") && (
            <div className="mb-6 bg-black/40 border border-white/20 rounded-xl p-6 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[0.65rem] tracking-[0.3em] uppercase text-parchment-dim mb-1 block">Current Question</span>
                  <div className="text-2xl font-[family-name:var(--font-cinzel)] text-gold-bright drop-shadow-md">
                    Q{adminQuizState.currentQuestion} <span className="text-sm text-parchment-dim opacity-70">/ {questionCount}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[0.65rem] tracking-[0.3em] uppercase text-parchment-dim mb-1 block">Server Timer</span>
                  <div className={`text-4xl sm:text-5xl font-light tabular-nums font-[family-name:var(--font-cinzel)] transition-colors ${timeLeft <= 10 && timeLeft > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {timeLeft > 0 ? timeLeft : (gameState === "TIME_UP" || gameState === "REVEAL" ? "TIME'S UP" : "0")}
                  </div>
                </div>
              </div>
              
              <div className="text-xl sm:text-2xl text-white mb-6 font-medium leading-relaxed drop-shadow-md">
                {adminQuizState.questionData.question}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {(["A", "B", "C", "D"] as const).map(opt => {
                  const isCorrect = adminQuizState.questionData.correct_option === opt;
                  const isRevealed = gameState === "REVEAL";
                  const baseClass = "p-4 rounded-xl border flex items-center gap-3 transition-colors text-sm sm:text-base ";
                  
                  let stateClass = "border-white/10 bg-white/5 text-parchment-dim";
                  if (isRevealed && isCorrect) {
                     stateClass = "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                  } else if (isRevealed && !isCorrect) {
                     stateClass = "border-white/5 bg-black/40 opacity-40 text-parchment-dim";
                  }

                  return (
                    <div key={opt} className={baseClass + stateClass}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 font-[family-name:var(--font-cinzel)] ${isRevealed && isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-black/40 border border-white/10'}`}>
                        {opt}
                      </div>
                      <span className={isRevealed && isCorrect ? 'text-white' : ''}>{adminQuizState.questionData[`option_${opt.toLowerCase()}`]}</span>
                    </div>
                  )
                })}
              </div>

              {gameState === "REVEAL" && (
                <div className="mt-2 text-center text-emerald-400 font-bold tracking-widest text-lg sm:text-xl animate-fade-in py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  ANSWER REVEALED
                </div>
              )}
            </div>
          )}

          {/* SECTION C: PRIMARY ACTION */}
          <div className="mb-8 flex flex-col items-center justify-center p-8 bg-black/40 border border-white/20 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6)]">
             <h3 className="text-[0.65rem] tracking-[0.3em] uppercase text-parchment-dim mb-6 opacity-80">Primary Action</h3>
             
             {gameState === "QUESTIONS_READY" || gameState === "RESTARTED" ? (
               <div className="flex flex-col items-center">
                 <button 
                   className="btn-magic text-xl py-4 px-12" 
                   onClick={handleStartQuiz}
                   disabled={starting}
                 >
                   {starting ? "..." : "▶ START QUIZ"}
                 </button>
                 <span className="text-sm text-parchment-dim mt-4">Start the countdown and display the question</span>
               </div>
             ) : gameState === "LIVE" ? (
               <div className="flex flex-col items-center">
                 <button className="btn-magic text-xl py-4 px-12 opacity-50 cursor-not-allowed" disabled>
                   🔒 REVEAL ANSWER
                 </button>
                 <span className="text-sm text-parchment-dim mt-4">Available when the timer reaches 0</span>
               </div>
             ) : gameState === "TIME_UP" ? (
               <div className="flex flex-col items-center">
                 <button 
                   className={`btn-magic text-xl py-4 px-12 shadow-[0_0_25px_rgba(16,185,129,0.5)] ${revealing ? 'opacity-80 cursor-wait' : ''}`}
                   onClick={handleRevealAnswer}
                   disabled={revealing}
                 >
                   {revealing ? "⏳ REVEALING..." : "🔓 REVEAL ANSWER"}
                 </button>
                 <span className={`text-sm mt-4 ${revealing ? 'text-parchment-dim' : 'text-emerald-400'}`}>
                   {revealing ? "Processing request..." : "Reveal the correct answer to everyone"}
                 </span>
               </div>
             ) : gameState === "REVEAL" ? (
                <div className="flex flex-col items-center animate-fade-in">
                  <div className="text-emerald-400 text-3xl font-bold font-[family-name:var(--font-cinzel)] tracking-widest drop-shadow-md py-4">
                    🎉 ANSWER REVEALED
                  </div>
                  <button 
                    className={`btn-magic text-xl py-4 px-12 mt-4 shadow-[0_0_25px_rgba(201,162,39,0.5)] ${advancing ? 'opacity-80 cursor-wait' : ''}`}
                    onClick={handleNextQuestion}
                    disabled={advancing}
                  >
                    {advancing ? "ADVANCING..." : "▶ NEXT QUESTION"}
                  </button>
                  <span className="text-sm text-parchment-dim mt-4">Proceed to the next question</span>
                </div>
             ) : gameState === "PAUSED" ? (
               <div className="flex flex-col items-center">
                 <button className="btn-magic text-xl py-4 px-12 shadow-[0_0_20px_rgba(57,255,20,0.3)]" onClick={handleResumeQuiz}>
                   ▶ RESUME QUIZ
                 </button>
                 <span className="text-sm text-[#39ff14] mt-4">Quiz is currently paused</span>
               </div>
             ) : (
               <div className="text-parchment-dim italic">No primary action available</div>
             )}
          </div>

          {/* SECTION D: OTHER CONTROLS */}
          <div className="mb-8">
            <h3 className="font-[family-name:var(--font-cinzel)] text-[1.1rem] tracking-[0.1em] text-gold-dim mb-4 border-b border-white/5 pb-2">
              OTHER CONTROLS
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              
              <div className="flex flex-wrap gap-3 w-full justify-start items-center">
                {/* Upload Questions - Only active if not in a game */}
                <button 
                  className="small-btn bg-blue-900/50 border-blue-500/50 hover:bg-blue-800/80" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || gameState === "LIVE" || gameState === "COMPLETED" || gameState === "PAUSED" || gameState === "TIME_UP" || gameState === "REVEAL"}
                >
                  {uploading ? "Uploading..." : "⬆ UPLOAD QUESTIONS"}
                </button>

                <div className="w-px h-8 bg-white/10 hidden sm:block mx-1"></div>

                {/* Open Projector */}
                <button 
                  className="small-btn bg-purple-900/50 border-purple-500/50 text-purple-300 hover:bg-purple-800/80"
                  onClick={() => window.open('/projector', '_blank')}
                >
                  📺 OPEN PROJECTOR
                </button>

                <div className="w-px h-8 bg-white/10 hidden sm:block mx-1"></div>

                {gameState === "LIVE" && (
                  <button className="small-btn bg-orange-900/50 border-orange-500/50 text-orange-400 hover:bg-orange-800/80 font-bold" onClick={handlePauseQuiz}>
                    ⏸ PAUSE QUIZ
                  </button>
                )}

                <div className="flex-grow"></div>

                {/* Dangerous / Secondary Actions */}
                <button className="small-btn danger opacity-80 hover:opacity-100" onClick={handleRestartQuiz}>
                  ↺ RESTART QUIZ
                </button>
                <button className="small-btn danger opacity-80 hover:opacity-100" onClick={() => setShowResetModal(true)}>
                  ⟲ NEW ROUND
                </button>
              </div>
            </div>
          </div>

          {/* SECTION D: PARTICIPANT / HOUSE INFORMATION */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-white/5 pb-2 gap-3">
               <h3 className="font-[family-name:var(--font-cinzel)] text-[1.1rem] tracking-[0.1em] text-gold-dim m-0">
                 PARTICIPANT ROSTER
               </h3>
               <div className="flex items-center gap-2">
                 <input
                   type="text"
                   className="magic-input text-left w-full sm:max-w-[280px] !py-1.5 !px-3 !text-[0.8rem] m-0"
                   placeholder="Search name or USN…"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
                 <button className="small-btn p-1.5 px-3 opacity-80 hover:opacity-100" onClick={() => { loadData(); fetchAdminQuizState(); }} title="Manual Refresh">
                   ↻
                 </button>
                 <button className="small-btn p-1.5 px-3 opacity-80 hover:opacity-100" onClick={handleExport} title="Export CSV">
                   ⬇ CSV
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
