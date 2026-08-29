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

          </div>
        )}

      </main>
    </div>
  );
}
