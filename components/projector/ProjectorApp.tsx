"use client";

import { useState, useEffect, useCallback } from "react";
import StarField from "@/components/effects/StarField";
import { HOUSES, type HouseDefinition } from "@/lib/houses";
import type { HouseName } from "@/lib/models/participant";

export interface ProjectorState {
  gameState: string;
  currentQuestion: number;
  totalQuestions: number;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  questionData: {
    questionNumber: number;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option?: string;
  } | null;
  counts?: Record<HouseName, number>;
  totalParticipants?: number;
  histogram?: Record<string, number>;
  fastestAnswers?: { rank: number; name: string; usn: string; house: HouseName; timeMs: number; points: number }[];
  questionHousePoints?: Record<string, number>;
  projectorDisplay?: { mode: string; selectedHouse: string | null };
  houseRaceData?: { house: string; points: number }[];
  houseDetailsData?: { name: string; usn: string; score: number }[];
  houseDetailsTotal?: number;
  houseDetailsHouse?: string;
  individualRaceData?: { name: string; usn: string; house: string; score: number }[];
}

export default function ProjectorApp() {
  const [state, setState] = useState<ProjectorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/projector/state");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch state");
      setState(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500); // Poll every 1.5s
    return () => clearInterval(interval);
  }, [fetchState]);

  useEffect(() => {
    const updateTimer = () => {
      if (!state?.questionEndsAt) {
        setTimeLeft(0);
        return;
      }
      
      const now = new Date().getTime();
      const end = new Date(state.questionEndsAt).getTime();
      
      const remaining = Math.max(0, Math.ceil((end - now) / 1000));
      setTimeLeft(remaining);
      
      // We don't trigger state changes based on the timer; 
      // the server gameState remains authoritative.
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [state?.questionEndsAt]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#03050a]">
        <div className="text-parchment animate-pulse font-[family-name:var(--font-cinzel)] tracking-widest text-4xl">
          Loading Projector...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#03050a]">
        <p className="text-red-400 text-2xl">{error}</p>
      </div>
    );
  }

  if (!state) return null;

  const gameState = state.gameState;

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#03050a] flex justify-center selection:bg-white/10 cursor-default">
      <StarField />

      <main className="relative z-10 w-full min-h-dvh flex flex-col items-center justify-center p-8 lg:p-16 max-w-[1600px] mx-auto">

        {/* === RACE DISPLAYS (override normal content when active) === */}
        {state.projectorDisplay?.mode === "HOUSE_RACE" && state.houseRaceData && (
          <div className="w-full max-w-6xl flex flex-col items-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-cinzel)] text-gold-bright drop-shadow-[0_0_20px_rgba(201,162,39,0.5)] mb-4 tracking-widest">
              🏆 LIVE HOUSE RACE
            </h1>
            <p className="text-xl text-parchment-dim mb-16 tracking-widest">Cumulative scores through Question {state.currentQuestion}</p>
            
            {(() => {
              const maxPts = Math.max(1, ...state.houseRaceData!.map(h => h.points));
              const sorted = [...state.houseRaceData!].sort((a, b) => b.points - a.points);
              return (
                <div className="flex flex-col gap-8 w-full max-w-5xl">
                  {sorted.map((entry, idx) => {
                    const h = HOUSES[entry.house as HouseName];
                    if (!h) return null;
                    const pct = (entry.points / maxPts) * 100;
                    return (
                      <div key={entry.house} className="flex items-center gap-6 w-full">
                        <div className="text-3xl font-[family-name:var(--font-cinzel)] text-gold-bright w-10 text-center tabular-nums">
                          {idx + 1}
                        </div>
                        <div className="w-14 h-14 shrink-0">
                          <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-lg" />
                        </div>
                        <div className="w-36 shrink-0 font-[family-name:var(--font-cinzel)] font-bold text-2xl tracking-wider" style={{ color: h.c2 }}>
                          {h.name}
                        </div>
                        <div className="flex-grow h-14 bg-black/60 rounded-lg overflow-hidden flex items-center border border-white/10 relative">
                          <div 
                            className="h-full transition-all duration-1000 ease-out rounded-r-md"
                            style={{ width: `${Math.max(2, pct)}%`, backgroundColor: `${h.c2}90` }}
                          />
                        </div>
                        <div className="w-24 shrink-0 text-right tabular-nums font-bold text-4xl drop-shadow-md" style={{ color: entry.points > 0 ? h.c2 : '#666' }}>
                          {entry.points}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {state.projectorDisplay?.mode === "HOUSE_DETAILS" && state.houseDetailsData && state.houseDetailsHouse && (
          <div className="w-full max-w-6xl flex flex-col items-center animate-fade-in">
            {(() => {
              const houseKey = (state.houseDetailsHouse || "gryffindor").toLowerCase() as HouseName;
              const h = HOUSES[houseKey] || HOUSES["gryffindor"];
              return (
                <>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="w-20 h-20">
                      <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-lg" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-cinzel)] tracking-widest drop-shadow-xl" style={{ color: h.c2 }}>
                      {h.name}
                    </h1>
                  </div>
                  <div className="text-3xl font-bold text-white mb-12 tracking-widest">
                    TOTAL: <span style={{ color: h.c2 }}>{state.houseDetailsTotal || 0}</span> POINTS
                  </div>
                  
                  <div className="w-full glass-panel-premium p-8 md:p-12">
                    <h3 className="text-2xl font-[family-name:var(--font-cinzel)] text-gold-bright mb-8 tracking-widest border-b border-white/10 pb-4">TOP CONTRIBUTORS</h3>
                    {(() => {
                      const members = state.houseDetailsData || [];
                      // Split into columns of ~15 for readability on projector
                      const COL_SIZE = 15;
                      const columns: typeof members[] = [];
                      for (let i = 0; i < members.length; i += COL_SIZE) {
                        columns.push(members.slice(i, i + COL_SIZE));
                      }
                      let globalIdx = 0;
                      return (
                        <div className="flex gap-8 w-full overflow-x-auto">
                          {columns.map((col, colIdx) => (
                            <div key={colIdx} className="flex-1 min-w-[300px]">
                              <table className="w-full text-left">
                                <thead className="text-parchment-dim text-xs uppercase tracking-widest border-b border-white/10">
                                  <tr>
                                    <th className="p-3 font-medium w-12">#</th>
                                    <th className="p-3 font-medium">Name</th>
                                    <th className="p-3 font-medium">USN</th>
                                    <th className="p-3 font-medium text-right">Points</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {col.map((member) => {
                                    globalIdx++;
                                    const rank = globalIdx;
                                    return (
                                      <tr key={member.usn} className="bg-white/5 hover:bg-white/10 transition-colors">
                                        <td className="p-3 text-parchment-dim tabular-nums">{rank}</td>
                                        <td className="p-3 text-white font-medium">{member.name}</td>
                                        <td className="p-3 text-parchment-dim text-sm tracking-wider">{member.usn}</td>
                                        <td className="p-3 text-right tabular-nums font-bold text-xl" style={{ color: member.score > 0 ? h.c2 : '#666' }}>+{member.score}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {state.projectorDisplay?.mode === "INDIVIDUAL_RACE" && state.individualRaceData && (
          <div className="w-full max-w-6xl flex flex-col items-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-cinzel)] text-gold-bright drop-shadow-[0_0_20px_rgba(201,162,39,0.5)] mb-4 tracking-widest">
              🏆 INDIVIDUAL RACE
            </h1>
            <p className="text-xl text-parchment-dim mb-12 tracking-widest">Cumulative scores through Question {state.currentQuestion}</p>
            
            {(() => {
              const participants = state.individualRaceData || [];
              const COL_SIZE = 20;
              const columns: typeof participants[] = [];
              for (let i = 0; i < participants.length; i += COL_SIZE) {
                columns.push(participants.slice(i, i + COL_SIZE));
              }
              let globalIdx = 0;
              return (
                <div className="flex gap-6 w-full overflow-x-auto">
                  {columns.map((col, colIdx) => (
                    <div key={colIdx} className="flex-1 min-w-[350px] glass-panel-premium p-6">
                      <table className="w-full text-left">
                        <thead className="text-parchment-dim text-xs uppercase tracking-widest border-b border-white/10">
                          <tr>
                            <th className="p-2 font-medium w-12">#</th>
                            <th className="p-2 font-medium">Name</th>
                            <th className="p-2 font-medium">USN</th>
                            <th className="p-2 font-medium text-center">House</th>
                            <th className="p-2 font-medium text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {col.map((p) => {
                            globalIdx++;
                            const rank = globalIdx;
                            const ph = HOUSES[(p.house || "gryffindor").toLowerCase() as HouseName] || HOUSES["gryffindor"];
                            return (
                              <tr key={p.usn} className={`transition-colors ${rank <= 3 ? 'bg-gold-bright/5' : 'bg-white/5 hover:bg-white/10'}`}>
                                <td className={`p-2 tabular-nums font-[family-name:var(--font-cinzel)] ${rank <= 3 ? 'text-gold-bright font-bold text-lg' : 'text-parchment-dim'}`}>{rank}</td>
                                <td className="p-2 text-white font-medium">{p.name}</td>
                                <td className="p-2 text-parchment-dim text-xs tracking-wider">{p.usn}</td>
                                <td className="p-2 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase border" style={{ borderColor: ph.c2, color: ph.c2, backgroundColor: `${ph.c2}15` }}>
                                    {ph.name}
                                  </span>
                                </td>
                                <td className="p-2 text-right tabular-nums font-bold text-lg" style={{ color: p.score > 0 ? '#e8c968' : '#666' }}>{p.score}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* === NORMAL DISPLAY (only when no race is active) === */}
        {(!state.projectorDisplay || state.projectorDisplay.mode === "NORMAL") && (
          <>
        {/* LOBBY STATE */}
        {(gameState === "WAITING" || gameState === "QUESTIONS_READY") && (
          <div className="w-full max-w-5xl flex flex-col items-center animate-fade-in text-center">
            <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-cinzel)] text-gold-bright drop-shadow-[0_0_20px_rgba(201,162,39,0.5)] mb-6">
              Wiki Tech Quiz
            </h1>
            
            <p className="text-2xl md:text-3xl text-parchment-dim mb-16 tracking-widest animate-pulse">
              Waiting for everyone...
            </p>

            <div className="glass-panel-premium w-full p-8 md:p-12 mb-12">
               <h2 className="text-3xl font-[family-name:var(--font-cinzel)] text-white mb-8 border-b border-white/10 pb-4">
                 Total Participants: {state.totalParticipants || 0}
               </h2>
               
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                 {(Object.keys(HOUSES) as HouseName[]).map((house) => {
                   const h = HOUSES[house];
                   const count = state.counts?.[house] || 0;
                   return (
                     <div key={house} className="flex flex-col items-center p-6 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
                       <div 
                          className="absolute inset-0 opacity-20"
                          style={{ background: `radial-gradient(circle at center, ${h.c2} 0%, transparent 70%)` }}
                       />
                       <div className="w-16 h-16 mb-4 relative z-10">
                          <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-lg" />
                       </div>
                       <div className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-white mb-2 z-10">{h.name}</div>
                       <div className="text-4xl font-light tabular-nums text-gold-bright drop-shadow-md z-10">{count}</div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        )}

        {/* QUESTION / TIME_UP / REVEAL STATE */}
        {(gameState === "LIVE" || gameState === "TIME_UP" || gameState === "REVEAL") && state.questionData && (
          <div className="w-full max-w-6xl flex flex-col items-center animate-fade-in-up">
            
            {/* Header / Timer */}
            <div className="w-full flex items-end justify-between mb-12 px-8 border-b border-white/10 pb-6 relative">
              <div className="flex flex-col items-start z-10">
                <span className="text-sm tracking-[0.3em] uppercase text-parchment-dim mb-2">Question</span>
                <div className="text-4xl md:text-5xl font-[family-name:var(--font-cinzel)] text-gold-bright tracking-widest drop-shadow-[0_0_15px_rgba(201,162,39,0.4)]">
                  {String(state.questionData.questionNumber).padStart(2, '0')} 
                  <span className="text-2xl text-parchment-dim opacity-70 ml-2">/ {state.totalQuestions}</span>
                </div>
              </div>

              <div className="flex flex-col items-center z-10 absolute left-1/2 bottom-6 -translate-x-1/2">
                {gameState === "LIVE" ? (
                  <>
                    <span className="text-xs tracking-[0.3em] uppercase text-parchment-dim mb-2 opacity-70">Time Remaining</span>
                    <div className={`text-6xl md:text-8xl font-light tabular-nums font-[family-name:var(--font-cinzel)] ${timeLeft <= 10 ? 'text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110' : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]'} transition-all duration-300`}>
                      {timeLeft}
                    </div>
                  </>
                ) : gameState === "TIME_UP" ? (
                  <div className="text-5xl md:text-6xl font-bold font-[family-name:var(--font-cinzel)] text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.6)] uppercase tracking-widest">
                    TIME'S UP
                  </div>
                ) : gameState === "REVEAL" ? (
                  <div className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-cinzel)] text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.6)] uppercase tracking-widest">
                    ANSWER REVEALED
                  </div>
                ) : null}
              </div>
            </div>

            {/* Question Card */}
            <div className="glass-panel-premium w-full p-12 md:p-16 mb-16 relative overflow-hidden flex items-center justify-center min-h-[250px]">
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white/20 opacity-50 rounded-tl-xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white/20 opacity-50 rounded-br-xl" />
              
              <h2 className="text-4xl md:text-6xl font-[family-name:var(--font-cinzel)] leading-tight m-0 text-center text-white drop-shadow-xl tracking-wide font-medium">
                {state.questionData.question}
              </h2>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const text = state.questionData![`option_${opt.toLowerCase()}` as keyof typeof state.questionData];
                
                const isRevealed = gameState === "REVEAL";
                const isCorrect = isRevealed && state.questionData!.correct_option === opt;
                
                let stateClass = "border-white/10 bg-[rgba(10,12,20,0.6)] text-parchment-dim";
                
                if (isRevealed) {
                  if (isCorrect) {
                     stateClass = "border-emerald-500 bg-emerald-500/20 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-[1.02] transform transition-transform";
                  } else {
                     stateClass = "border-white/5 bg-black/60 opacity-30 text-parchment-dim";
                  }
                }

                return (
                  <div
                    key={opt}
                    className={`p-8 md:p-10 rounded-2xl backdrop-blur-md flex items-center gap-8 relative overflow-hidden ${stateClass}`}
                  >
                    {isCorrect && (
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-10 animate-[shimmer_2s_infinite]" />
                    )}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold font-[family-name:var(--font-cinzel)] shrink-0 text-3xl ${
                      isCorrect 
                        ? 'bg-emerald-500/30 text-emerald-300 border-2 border-emerald-500/50' 
                        : 'bg-black/50 text-parchment-dim border-2 border-white/10'
                    }`}>
                      {opt}
                    </div>
                    <div className="text-2xl md:text-3xl leading-snug">
                      {text as string}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* POST-REVEAL RESULTS */}
            {gameState === "REVEAL" && (
              <div className="w-full flex flex-col gap-16 mt-20 animate-fade-in-up border-t border-white/10 pt-16">
                
                {/* 1. ANSWER DISTRIBUTION HISTOGRAM (VERTICAL) */}
                {state.histogram && (
                  <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-10 animate-fade-in-up">
                    <h3 className="text-3xl font-[family-name:var(--font-cinzel)] text-gold-bright mb-2 text-center drop-shadow-md tracking-widest">
                      ANSWER DISTRIBUTION
                    </h3>
                    
                    <div className="text-center mb-10">
                      <span className="inline-block px-6 py-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold tracking-widest text-xl">
                        CORRECT ANSWER: {state.questionData.correct_option}
                      </span>
                    </div>

                    <div className="flex justify-center items-end gap-8 sm:gap-16 w-full max-w-4xl mx-auto h-64 mt-8">
                      {(["A", "B", "C", "D"] as const).map(opt => {
                        const count = state.histogram![opt] || 0;
                        const total = Object.values(state.histogram!).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        const isCorrect = state.questionData!.correct_option === opt;
                        
                        return (
                          <div key={opt} className="flex flex-col items-center justify-end h-full w-24">
                            <div className="text-white font-bold text-2xl drop-shadow-md mb-2">
                              {count}
                            </div>
                            <div className="w-full h-full bg-black/60 rounded-t-lg overflow-hidden flex flex-col justify-end border-b-0 border border-white/5 relative">
                              <div 
                                className={`w-full transition-all duration-1000 ease-out ${
                                  isCorrect ? 'bg-emerald-500/80' : 'bg-rose-500/60'
                                }`}
                                style={{ height: `${percentage}%` }}
                              />
                            </div>
                            <div className={`w-full py-3 mt-4 flex items-center justify-center font-bold text-3xl rounded-lg font-[family-name:var(--font-cinzel)] ${
                              isCorrect ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10 text-parchment-dim'
                            }`}>
                              {opt}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. TOP 5 FASTEST CORRECT */}
                {state.fastestAnswers && state.fastestAnswers.length > 0 && (
                  <div 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-10 animate-fade-in-up"
                    style={{ animationDelay: '1.5s', animationFillMode: 'both' }}
                  >
                    <h3 className="text-3xl font-[family-name:var(--font-cinzel)] text-emerald-400 mb-8 text-center drop-shadow-md tracking-widest">
                      ⚡ TOP {Math.min(5, state.fastestAnswers.length)} FASTEST CORRECT
                    </h3>
                    <div className="w-full max-w-5xl mx-auto overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full text-left text-lg">
                        <thead className="bg-black/60 text-parchment-dim text-sm uppercase tracking-widest border-b border-white/10">
                          <tr>
                            <th className="p-6 font-medium w-20 text-center">Rank</th>
                            <th className="p-6 font-medium">Participant</th>
                            <th className="p-6 font-medium text-center">House</th>
                            <th className="p-6 font-medium text-right">Time</th>
                            <th className="p-6 font-medium text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {state.fastestAnswers.map((ans) => {
                            const safeHouse = (ans.house || "gryffindor").toLowerCase() as HouseName;
                            const h = HOUSES[safeHouse] || HOUSES["gryffindor"];
                            return (
                              <tr key={ans.usn} className="bg-white/5 hover:bg-white/10 transition-colors">
                                <td className="p-6 text-center font-[family-name:var(--font-cinzel)] text-2xl text-gold-bright">
                                  #{ans.rank}
                                </td>
                                <td className="p-6">
                                  <div className="font-bold text-white text-xl">{ans.name || "Unknown"}</div>
                                  <div className="text-sm text-parchment-dim opacity-70 tracking-widest">{ans.usn || "N/A"}</div>
                                </td>
                                <td className="p-6 text-center">
                                  <span className="inline-block px-4 py-2 rounded-lg text-sm font-bold tracking-widest uppercase border" style={{ borderColor: h.c2, color: h.c2, backgroundColor: `${h.c2}20` }}>
                                    {h.name}
                                  </span>
                                </td>
                                <td className="p-6 text-right tabular-nums text-white text-xl">
                                  {(ans.timeMs / 1000).toFixed(2)}s
                                </td>
                                <td className="p-6 text-right tabular-nums font-bold text-emerald-400 text-2xl drop-shadow-md">
                                  +{ans.points}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. QUESTION HOUSE POINTS (VERTICAL BARS) */}
                {state.questionHousePoints && (
                  <div 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-10 animate-fade-in-up"
                    style={{ animationDelay: '3s', animationFillMode: 'both' }}
                  >
                    <h3 className="text-3xl font-[family-name:var(--font-cinzel)] text-gold-bright mb-10 text-center drop-shadow-md tracking-widest uppercase">
                      🏠 POINTS EARNED — QUESTION {state.questionData.questionNumber}
                    </h3>
                    
                    <div className="flex justify-center items-end gap-6 sm:gap-12 w-full max-w-5xl mx-auto h-64 mt-12">
                      {(Object.keys(HOUSES) as HouseName[]).map(house => {
                        const h = HOUSES[house];
                        const pts = state.questionHousePoints![house] || 0;
                        
                        // Find max points for scale
                        const maxPts = Math.max(1, ...Object.values(state.questionHousePoints || {}));
                        const percentage = (pts / maxPts) * 100;

                        return (
                          <div key={house} className="flex flex-col items-center justify-end h-full w-28 sm:w-32">
                            <div className="text-white font-bold text-4xl drop-shadow-md mb-3" style={{ color: pts > 0 ? h.c2 : '#666' }}>
                              +{pts}
                            </div>
                            <div className="w-full h-full bg-black/60 rounded-t-xl overflow-hidden flex flex-col justify-end border-b-0 border border-white/10 relative">
                              <div 
                                className="w-full transition-all duration-1000 ease-out"
                                style={{ height: `${percentage}%`, backgroundColor: `${h.c2}90` }}
                              />
                            </div>
                            <div 
                              className="w-full py-4 mt-6 flex flex-col items-center justify-center font-bold text-base sm:text-lg rounded-xl font-[family-name:var(--font-cinzel)] tracking-widest border border-white/10"
                              style={{ color: h.c2, backgroundColor: `${h.c2}15` }}
                            >
                              <div className="w-12 h-12 mb-2">
                                <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-lg opacity-90" />
                              </div>
                              {h.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </>
        )}

      </main>
    </div>
  );
}
