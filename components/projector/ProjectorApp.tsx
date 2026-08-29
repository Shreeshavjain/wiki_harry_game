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
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#030408] flex justify-center selection:bg-white/10 cursor-default">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(60,40,110,0.06)_0%,transparent_80%)] mix-blend-screen pointer-events-none" />
      <StarField />

      <main className="relative z-10 w-full min-h-dvh flex flex-col items-center justify-center p-8 lg:p-16 max-w-[1920px] mx-auto">

        {/* === RACE DISPLAYS (override normal content when active) === */}
        {state.projectorDisplay?.mode === "HOUSE_RACE" && state.houseRaceData && (
          <div className="w-full max-w-[90rem] flex flex-col items-center animate-fade-in pt-6">
            <h1 className="text-7xl md:text-[6.5rem] font-[family-name:var(--font-cinzel)] text-gold-bright drop-shadow-[0_4px_25px_rgba(201,162,39,0.35)] mb-4 tracking-[0.2em] uppercase leading-tight text-center">
              🏆 LIVE HOUSE RACE
            </h1>
            <p className="text-2xl md:text-3xl text-parchment-dim mb-20 tracking-[0.3em] font-medium uppercase opacity-90 text-center">
              Cumulative Scores • Through Question {state.currentQuestion}
            </p>
            
            {(() => {
              const maxPts = Math.max(1, ...state.houseRaceData!.map(h => h.points));
              const sorted = [...state.houseRaceData!].sort((a, b) => b.points - a.points);
              
              return (
                <div className="flex flex-col gap-10 w-full max-w-[80rem]">
                  {sorted.map((entry, idx) => {
                    const h = HOUSES[entry.house as HouseName];
                    if (!h) return null;
                    const pct = (entry.points / maxPts) * 100;
                    const isLeader = idx === 0 && entry.points > 0;
                    
                    return (
                      <div key={entry.house} className="flex items-center gap-6 w-full">
                        <div className="w-24 text-center shrink-0">
                          {idx === 0 ? <span className="text-7xl drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">🥇</span> 
                         : idx === 1 ? <span className="text-7xl drop-shadow-[0_0_15px_rgba(192,192,192,0.5)]">🥈</span> 
                         : idx === 2 ? <span className="text-7xl drop-shadow-[0_0_15px_rgba(205,127,50,0.5)]">🥉</span> 
                         : <span className="text-6xl font-[family-name:var(--font-cinzel)] text-parchment-dim/50 font-bold tabular-nums">4</span>}
                        </div>
                        
                        <div className="w-24 h-24 shrink-0 mx-4">
                          <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]" />
                        </div>
                        
                        <div className="w-72 shrink-0 flex flex-col justify-center">
                          <div className="font-[family-name:var(--font-cinzel)] font-bold text-4xl md:text-5xl tracking-widest uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" style={{ color: h.text }}>
                            {h.name}
                          </div>
                          <div className="h-8 mt-2">
                            {isLeader && (
                              <span className="inline-flex items-center gap-2 text-xs md:text-sm font-bold px-3 py-1 rounded uppercase tracking-[0.3em] border shadow-lg"
                                    style={{ color: h.highlight, borderColor: `${h.highlight}40`, backgroundColor: `${h.accent}15` }}>
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: h.highlight, boxShadow: `0 0 8px ${h.highlight}` }}></span>
                                CURRENT LEADER
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-grow h-20 bg-[#030408]/80 rounded-r-xl overflow-hidden flex items-center border-l-4 relative border-y border-r border-white/10 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-sm" style={{ borderLeftColor: h.accent }}>
                          <div 
                            className="h-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${Math.max(0.5, pct)}%`, 
                              backgroundColor: h.accent, 
                              opacity: isLeader ? 1 : 0.85,
                              boxShadow: isLeader ? `inset 0 0 30px ${h.highlight}90, 0 0 25px ${h.accent}60` : `inset 0 0 15px ${h.highlight}40`
                            }}
                          />
                        </div>
                        
                        <div className="w-40 shrink-0 text-right tabular-nums font-bold text-6xl md:text-7xl drop-shadow-[0_6px_16px_rgba(0,0,0,0.9)] pl-6" style={{ color: entry.points > 0 ? '#ffffff' : '#555555' }}>
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
          <div className="w-full max-w-[90rem] flex flex-col items-center animate-fade-in pt-6">
            {(() => {
              const houseKey = (state.houseDetailsHouse || "gryffindor").toLowerCase() as HouseName;
              const h = HOUSES[houseKey] || HOUSES["gryffindor"];
              return (
                <>
                  <div className="flex items-center gap-10 mb-8">
                    <div className="w-40 h-40">
                      <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)]" />
                    </div>
                    <div className="flex flex-col">
                      <h1 className="text-7xl md:text-[6.5rem] font-[family-name:var(--font-cinzel)] tracking-[0.2em] drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] uppercase leading-tight" style={{ color: h.text }}>
                        {h.name}
                      </h1>
                      <div className="text-3xl md:text-4xl text-parchment-dim tracking-[0.3em] font-medium uppercase mt-4">
                        TOTAL: <span className="font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{state.houseDetailsTotal || 0}</span> POINTS
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full max-w-6xl glass-panel-premium border border-white/10 p-10 md:p-14 mt-6 bg-[#030408]/80 backdrop-blur-md rounded-2xl shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top, ${h.accent} 0%, transparent 60%)` }} />
                    
                    <h3 className="text-4xl font-[family-name:var(--font-cinzel)] mb-12 tracking-[0.3em] border-b border-white/10 pb-8 uppercase text-center relative z-10" style={{ color: h.highlight }}>
                      TOP CONTRIBUTORS
                    </h3>
                    
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
                        <div className="flex gap-16 w-full justify-center relative z-10">
                          {columns.map((col, colIdx) => (
                            <div key={colIdx} className="flex-1 max-w-2xl">
                              <table className="w-full text-left border-collapse table-fixed">
                                <thead className="text-parchment-dim text-base uppercase tracking-[0.3em] border-b border-white/15">
                                  <tr>
                                    <th className="p-5 font-medium w-24 text-center">RANK</th>
                                    <th className="p-5 font-medium">NAME</th>
                                    <th className="p-5 font-medium text-center w-32">USN</th>
                                    <th className="p-5 font-medium text-right w-32">SCORE</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                  {col.map((member) => {
                                    globalIdx++;
                                    const rank = globalIdx;
                                    return (
                                      <tr key={member.usn} className="bg-transparent hover:bg-white/5 transition-colors">
                                        <td className="p-5 text-center tabular-nums text-4xl">
                                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : <span className="text-3xl text-parchment-dim font-[family-name:var(--font-cinzel)] font-bold">{rank}</span>}
                                        </td>
                                        <td className="p-5 text-white font-medium text-3xl truncate drop-shadow-md">{member.name}</td>
                                        <td className="p-5 text-parchment-dim text-2xl tracking-wider font-mono text-center">{member.usn}</td>
                                        <td className="p-5 text-right tabular-nums font-bold text-4xl" style={{ color: member.score > 0 ? h.highlight : '#666' }}>+{member.score}</td>
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
          <div className="w-full max-w-[80rem] flex flex-col items-center animate-fade-in h-[calc(100dvh-6rem)] min-h-0 pt-2 pb-6">
            
            {/* Fixed Title and Subtitle */}
            <div className="shrink-0 flex flex-col items-center text-center mb-6">
              <h1 className="text-7xl md:text-[6.5rem] font-[family-name:var(--font-cinzel)] text-gold-bright drop-shadow-[0_4px_25px_rgba(201,162,39,0.35)] mb-4 tracking-[0.2em] uppercase leading-tight">
                🏆 INDIVIDUAL RACE
              </h1>
              <p className="text-2xl md:text-3xl text-parchment-dim tracking-[0.3em] font-medium uppercase opacity-90">
                Cumulative Scores • Through Question {state.currentQuestion}
              </p>
            </div>
            
            {/* Scrollable Leaderboard Container */}
            <div className="w-full flex-1 min-h-0 glass-panel-premium overflow-hidden flex flex-col shadow-2xl relative rounded-xl border border-white/10 bg-[#030408]/80 backdrop-blur-sm">
              
              <div className="w-full flex-1 overflow-y-auto overflow-x-hidden projector-scrollbar relative">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="text-parchment-dim text-sm uppercase tracking-[0.2em] sticky top-0 z-20 shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                    <tr className="bg-[#05070d] border-b border-white/20">
                      <th className="p-4 md:p-6 font-medium w-[100px] text-center">RANK</th>
                      <th className="p-4 md:p-6 font-medium min-w-[240px]">NAME</th>
                      <th className="p-4 md:p-6 font-medium w-[160px]">USN</th>
                      <th className="p-4 md:p-6 font-medium w-[200px]">HOUSE</th>
                      <th className="p-4 md:p-6 font-medium w-[120px] text-right">SCORE</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-white/5">
                    {(state.individualRaceData || []).map((p, idx) => {
                      const rank = idx + 1;
                      const ph = HOUSES[(p.house || "gryffindor").toLowerCase() as HouseName] || HOUSES["gryffindor"];
                      return (
                        <tr key={p.usn} className={`transition-colors hover:bg-white/10 ${rank <= 3 ? 'bg-gold-bright/5' : ''}`}>
                          <td className="p-4 md:p-6 text-center tabular-nums text-4xl">
                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : <span className="text-3xl text-parchment-dim font-[family-name:var(--font-cinzel)] font-bold">{rank}</span>}
                          </td>
                          
                          <td className="p-4 md:p-6">
                            <div className="flex flex-col justify-center max-w-[400px]">
                              {rank === 1 && (
                                <div className="mb-1">
                                  <span className="inline-flex items-center text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase tracking-widest border shadow-sm"
                                        style={{ color: '#ffca28', borderColor: 'rgba(255,202,40,0.5)', backgroundColor: 'rgba(255,202,40,0.15)' }}>
                                    <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse mr-1.5" style={{ backgroundColor: '#ffca28' }}></span>
                                    Current Leader
                                  </span>
                                </div>
                              )}
                              <div className="text-white font-medium text-2xl md:text-3xl truncate">
                                {p.name}
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4 md:p-6 text-parchment-dim text-xl tracking-wider font-mono">{p.usn}</td>
                          
                          <td className="p-4 md:p-6">
                            <span className="inline-block px-3 py-1.5 rounded-sm text-xs md:text-sm font-bold tracking-widest uppercase border shadow-md" 
                                  style={{ borderColor: `${ph.accent}80`, color: ph.text, backgroundColor: ph.surface, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                              {ph.name}
                            </span>
                          </td>
                          
                          <td className="p-4 md:p-6 text-right tabular-nums font-bold text-4xl md:text-5xl pr-6 md:pr-10" style={{ color: p.score > 0 ? '#ffffff' : '#666' }}>
                            {p.score}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === NORMAL DISPLAY (only when no race is active) === */}
        {(!state.projectorDisplay || state.projectorDisplay.mode === "NORMAL") && (
          <>
        {/* LOBBY STATE */}
        {(gameState === "WAITING" || gameState === "QUESTIONS_READY") && (
          <div className="w-full max-w-6xl flex flex-col items-center animate-fade-in text-center">
            <h1 className="text-7xl md:text-[8rem] font-[family-name:var(--font-cinzel)] text-gold-bright drop-shadow-[0_0_40px_rgba(201,162,39,0.4)] mb-8 tracking-[0.1em] leading-none">
              Wiki Tech Quiz
            </h1>
            
            <p className="text-3xl md:text-4xl text-parchment-dim mb-20 tracking-[0.4em] animate-pulse uppercase">
              Waiting for everyone...
            </p>

            <div className="glass-panel-premium w-full p-10 md:p-16 mb-12 bg-[#030408]/80 backdrop-blur-md rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-white/10">
               <h2 className="text-4xl font-[family-name:var(--font-cinzel)] text-white mb-12 border-b border-white/10 pb-8 tracking-[0.2em] uppercase">
                 Total Participants: <span className="text-gold-bright font-bold">{state.totalParticipants || 0}</span>
               </h2>
               
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                 {(Object.keys(HOUSES) as HouseName[]).map((house) => {
                   const h = HOUSES[house];
                   const count = state.counts?.[house] || 0;
                   return (
                     <div key={house} className="flex flex-col items-center p-10 rounded-2xl border relative overflow-hidden transition-all duration-500 shadow-xl"
                          style={{ backgroundColor: h.surface, borderColor: `${h.accent}50` }}>
                       {/* Subtle accent glow */}
                       <div 
                          className="absolute inset-0 opacity-20"
                          style={{ background: `radial-gradient(circle at top, ${h.accent} 0%, transparent 70%)` }}
                       />
                       <div className="w-20 h-20 mb-8 relative z-10">
                          <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" />
                       </div>
                       
                       <div className="text-7xl font-light tabular-nums drop-shadow-md z-10 mb-3 font-[family-name:var(--font-cinzel)]" 
                            style={{ color: '#ffffff', textShadow: `0 0 20px ${h.accent}80` }}>
                         {count}
                       </div>
                       <div className="text-2xl font-[family-name:var(--font-cinzel)] font-bold z-10 tracking-widest uppercase drop-shadow-md" 
                            style={{ color: h.text, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                         {h.name}
                       </div>
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
            <div className="w-full flex items-end justify-between mb-16 px-8 border-b border-white/15 pb-8 relative">
              <div className="flex flex-col items-start z-10">
                <span className="text-lg md:text-xl tracking-[0.4em] uppercase text-parchment-dim mb-3">Question</span>
                <div className="text-6xl md:text-7xl font-[family-name:var(--font-cinzel)] text-gold-bright tracking-widest drop-shadow-[0_0_20px_rgba(201,162,39,0.4)]">
                  {String(state.questionData.questionNumber).padStart(2, '0')} 
                  <span className="text-4xl text-parchment-dim opacity-60 ml-2">/ {state.totalQuestions}</span>
                </div>
              </div>

              <div className="flex flex-col items-center z-10 absolute left-1/2 bottom-8 -translate-x-1/2">
                {gameState === "LIVE" ? (
                  <>
                    <span className="text-sm tracking-[0.4em] uppercase text-parchment-dim mb-3 opacity-80">Time Remaining</span>
                    <div className={`text-7xl md:text-9xl font-light tabular-nums font-[family-name:var(--font-cinzel)] ${timeLeft <= 10 ? 'text-red-400 drop-shadow-[0_0_40px_rgba(239,68,68,0.7)] scale-110' : 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]'} transition-all duration-300`}>
                      {timeLeft}
                    </div>
                  </>
                ) : gameState === "TIME_UP" ? (
                  <div className="text-6xl md:text-7xl font-bold font-[family-name:var(--font-cinzel)] text-orange-500 drop-shadow-[0_0_40px_rgba(249,115,22,0.6)] uppercase tracking-[0.2em]">
                    TIME'S UP
                  </div>
                ) : gameState === "REVEAL" ? (
                  <div className="text-5xl md:text-6xl font-bold font-[family-name:var(--font-cinzel)] text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.6)] uppercase tracking-[0.2em]">
                    ANSWER REVEALED
                  </div>
                ) : null}
              </div>
            </div>

            {/* Question Card */}
            <div className="glass-panel-premium w-full p-16 md:p-20 mb-20 relative overflow-hidden flex items-center justify-center min-h-[300px] border border-white/15 shadow-2xl bg-[#030408]/80 backdrop-blur-md rounded-3xl">
              <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-gold-bright/30 opacity-70 rounded-tl-3xl" />
              <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-gold-bright/30 opacity-70 rounded-br-3xl" />
              
              <h2 className="text-5xl md:text-7xl font-[family-name:var(--font-cinzel)] leading-tight m-0 text-center text-white drop-shadow-2xl tracking-wide font-medium">
                {state.questionData.question}
              </h2>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-[100rem]">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const text = state.questionData![`option_${opt.toLowerCase()}` as keyof typeof state.questionData];
                
                const isRevealed = gameState === "REVEAL";
                const isCorrect = isRevealed && state.questionData!.correct_option === opt;
                
                let stateClass = "border-white/10 bg-[rgba(10,12,20,0.8)] text-parchment-dim shadow-xl";
                
                if (isRevealed) {
                  if (isCorrect) {
                     stateClass = "border-emerald-500 bg-emerald-500/20 text-white shadow-[0_0_50px_rgba(16,185,129,0.35)] scale-[1.02] transform transition-transform";
                  } else {
                     stateClass = "border-white/5 bg-black/60 opacity-30 text-parchment-dim shadow-none";
                  }
                }

                return (
                  <div
                    key={opt}
                    className={`p-10 md:p-12 rounded-3xl backdrop-blur-md flex items-center gap-10 relative overflow-hidden border ${stateClass}`}
                  >
                    {isCorrect && (
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-10 animate-[shimmer_2s_infinite]" />
                    )}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold font-[family-name:var(--font-cinzel)] shrink-0 text-4xl shadow-inner ${
                      isCorrect 
                        ? 'bg-emerald-500/30 text-emerald-300 border-2 border-emerald-500/50' 
                        : 'bg-black/50 text-parchment-dim border-2 border-white/10'
                    }`}>
                      {opt}
                    </div>
                    <div className="text-3xl md:text-4xl leading-snug">
                      {text as string}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* POST-REVEAL RESULTS */}
            {gameState === "REVEAL" && (
              <div className="w-full flex flex-col gap-20 mt-28 animate-fade-in-up border-t border-white/15 pt-20">
                
                {/* 1. ANSWER DISTRIBUTION HISTOGRAM (VERTICAL) */}
                {state.histogram && (
                  <div className="w-full bg-[#030408]/80 border border-white/10 rounded-3xl p-14 animate-fade-in-up shadow-2xl backdrop-blur-sm">
                    <h3 className="text-4xl font-[family-name:var(--font-cinzel)] text-gold-bright mb-4 text-center drop-shadow-lg tracking-[0.2em]">
                      ANSWER DISTRIBUTION
                    </h3>
                    
                    <div className="text-center mb-14">
                      <span className="inline-block px-8 py-3 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold tracking-[0.2em] text-2xl shadow-lg">
                        CORRECT ANSWER: {state.questionData.correct_option}
                      </span>
                    </div>

                    <div className="flex justify-center items-end gap-12 sm:gap-20 w-full max-w-5xl mx-auto h-72 mt-12">
                      {(["A", "B", "C", "D"] as const).map(opt => {
                        const count = state.histogram![opt] || 0;
                        const total = Object.values(state.histogram!).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        const isCorrect = state.questionData!.correct_option === opt;
                        
                        return (
                          <div key={opt} className="flex flex-col items-center justify-end h-full w-28">
                            <div className="text-white font-bold text-3xl drop-shadow-lg mb-3">
                              {count}
                            </div>
                            <div className="w-full h-full bg-black/80 rounded-t-xl overflow-hidden flex flex-col justify-end border-b-0 border border-white/10 relative shadow-inner">
                              <div 
                                className={`w-full transition-all duration-1000 ease-out ${
                                  isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                style={{ height: `${percentage}%`, opacity: 0.9 }}
                              />
                            </div>
                            <div className={`w-full py-4 mt-5 flex items-center justify-center font-bold text-4xl rounded-xl font-[family-name:var(--font-cinzel)] border ${
                              isCorrect ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]' : 'bg-[#0a0c14] border-white/10 text-parchment-dim shadow-md'
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
                    className="w-full bg-[#030408]/80 border border-white/10 rounded-3xl p-14 animate-fade-in-up shadow-2xl backdrop-blur-sm"
                    style={{ animationDelay: '1.5s', animationFillMode: 'both' }}
                  >
                    <h3 className="text-4xl font-[family-name:var(--font-cinzel)] text-emerald-400 mb-12 text-center drop-shadow-lg tracking-[0.2em]">
                      ⚡ TOP {Math.min(5, state.fastestAnswers.length)} FASTEST CORRECT
                    </h3>
                    <div className="w-full max-w-6xl mx-auto overflow-hidden rounded-2xl border border-white/15 shadow-xl bg-black/40">
                      <table className="w-full text-left text-xl">
                        <thead className="bg-[#05070d] text-parchment-dim text-base uppercase tracking-[0.3em] border-b border-white/20">
                          <tr>
                            <th className="p-8 font-medium w-32 text-center">RANK</th>
                            <th className="p-8 font-medium">PARTICIPANT</th>
                            <th className="p-8 font-medium text-center">HOUSE</th>
                            <th className="p-8 font-medium text-right">TIME</th>
                            <th className="p-8 font-medium text-right">POINTS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {state.fastestAnswers.map((ans) => {
                            const safeHouse = (ans.house || "gryffindor").toLowerCase() as HouseName;
                            const h = HOUSES[safeHouse] || HOUSES["gryffindor"];
                            return (
                              <tr key={ans.usn} className="bg-transparent hover:bg-white/5 transition-colors">
                                <td className="p-8 text-center font-[family-name:var(--font-cinzel)] text-3xl font-bold" style={{ color: h.highlight }}>
                                  #{ans.rank}
                                </td>
                                <td className="p-8">
                                  <div className="font-bold text-white text-3xl drop-shadow-md">{ans.name || "Unknown"}</div>
                                  <div className="text-lg text-parchment-dim opacity-80 tracking-widest mt-1 font-mono">{ans.usn || "N/A"}</div>
                                </td>
                                <td className="p-8 text-center">
                                  <span className="inline-block px-5 py-2.5 rounded-lg text-sm font-bold tracking-widest uppercase border shadow-md" style={{ borderColor: `${h.accent}80`, color: h.text, backgroundColor: h.surface, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                    {h.name}
                                  </span>
                                </td>
                                <td className="p-8 text-right tabular-nums text-white text-3xl">
                                  {(ans.timeMs / 1000).toFixed(2)}s
                                </td>
                                <td className="p-8 text-right tabular-nums font-bold text-emerald-400 text-4xl drop-shadow-lg">
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
                    className="w-full bg-[#030408]/80 border border-white/10 rounded-3xl p-14 animate-fade-in-up shadow-2xl backdrop-blur-sm"
                    style={{ animationDelay: '3s', animationFillMode: 'both' }}
                  >
                    <h3 className="text-4xl font-[family-name:var(--font-cinzel)] text-gold-bright mb-14 text-center drop-shadow-lg tracking-[0.2em] uppercase">
                      🏠 POINTS EARNED — QUESTION {state.questionData.questionNumber}
                    </h3>
                    
                    <div className="flex justify-center items-end gap-10 sm:gap-16 w-full max-w-6xl mx-auto h-72 mt-16">
                      {(Object.keys(HOUSES) as HouseName[]).map(house => {
                        const h = HOUSES[house];
                        const pts = state.questionHousePoints![house] || 0;
                        
                        // Find max points for scale
                        const maxPts = Math.max(1, ...Object.values(state.questionHousePoints || {}));
                        const percentage = (pts / maxPts) * 100;

                        return (
                          <div key={house} className="flex flex-col items-center justify-end h-full w-32 sm:w-40">
                            <div className="text-white font-bold text-5xl drop-shadow-lg mb-4" style={{ color: pts > 0 ? h.highlight : '#666' }}>
                              +{pts}
                            </div>
                            <div className="w-full h-full bg-black/80 rounded-t-2xl overflow-hidden flex flex-col justify-end border-b-0 border border-white/10 relative shadow-inner">
                              <div 
                                className="w-full transition-all duration-1000 ease-out"
                                style={{ height: `${percentage}%`, backgroundColor: h.accent, opacity: 0.9, boxShadow: pts > 0 ? `inset 0 0 20px ${h.highlight}80` : 'none' }}
                              />
                            </div>
                            <div 
                              className="w-full py-5 mt-6 flex flex-col items-center justify-center font-bold text-xl sm:text-2xl rounded-2xl font-[family-name:var(--font-cinzel)] tracking-[0.2em] border border-white/10 shadow-lg"
                              style={{ color: h.text, backgroundColor: h.surface }}
                            >
                              <div className="w-16 h-16 mb-3">
                                <svg viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: h.crest }} className="w-full h-full drop-shadow-lg opacity-100" />
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
