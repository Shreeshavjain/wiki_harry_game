"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StarField from "@/components/effects/StarField";
import WaitingScreen from "./WaitingScreen";
import LiveQuestion from "./LiveQuestion";
import QuizComplete from "./QuizComplete";
import { HOUSES } from "@/lib/houses";
import type { HouseName } from "@/lib/models/participant";

export interface QuizState {
  gameState: string;
  currentQuestion: number;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  score: number;
  house: HouseName;
  hasAnswered: boolean;
  questionData: {
    questionNumber: number;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option?: string;
  } | null;
  frozenRemainingMs?: number;
  quizAttempt?: number;
}

export default function QuizApp() {
  const router = useRouter();
  const [usn, setUsn] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("wiki_game_player");
    if (!stored) {
      router.replace("/");
      return;
    }
    try {
      const data = JSON.parse(stored);
      if (!data.usn) throw new Error("Invalid");
      setUsn(data.usn);
      setPlayerName(data.name);
    } catch {
      router.replace("/");
    }
  }, [router]);

  // Poll state
  const fetchState = useCallback(async () => {
    if (!usn) return;
    try {
      const res = await fetch(`/api/quiz/state?usn=${usn}`);
      if (res.status === 404) {
        // Participant not found (probably new round started)
        localStorage.removeItem("wiki_game_player");
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch state");
      const data = await res.json();
      setQuizState(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [usn, router]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Apply house theme if known
  useEffect(() => {
    if (quizState?.house) {
      const h = HOUSES[quizState.house];
      document.documentElement.style.setProperty("--house-c1", h.c1);
      document.documentElement.style.setProperty("--house-c2", h.c2);
      document.documentElement.style.setProperty("--house-accent", h.accent);
    }
  }, [quizState?.house]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-parchment animate-pulse heading-text tracking-widest">
          Loading Magic...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center px-4">
        <p className="text-red-400 mb-4">{error}</p>
        <button className="btn-ghost" onClick={() => router.replace("/")}>
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[var(--color-night-1)] flex justify-center">
      {/* Background Magic */}
      <StarField />
      
      {/* Subtle magical gradient overlay based on house if known */}
      {quizState?.house && (
        <>
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none transition-all duration-2000 animate-pulse"
            style={{
              background: `radial-gradient(circle at 50% -20%, var(--house-c2) 0%, transparent 60%)`
            }}
          />
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-3000 animate-float"
            style={{
              background: `radial-gradient(circle at 20% 80%, var(--house-accent) 0%, transparent 40%)`
            }}
          />
        </>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-5xl min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {quizState?.gameState === "WAITING" && <WaitingScreen state="WAITING" />}
        {quizState?.gameState === "QUESTIONS_READY" && <WaitingScreen state="QUESTIONS_READY" />}
        {(quizState?.gameState === "LIVE" || quizState?.gameState === "PAUSED" || quizState?.gameState === "TIME_UP" || quizState?.gameState === "REVEAL") && quizState.questionData && usn ? (
          <LiveQuestion 
            quizState={quizState} 
            usn={usn} 
            onStateRefresh={fetchState}
          />
        ) : (quizState?.gameState === "LIVE" || quizState?.gameState === "PAUSED" || quizState?.gameState === "TIME_UP" || quizState?.gameState === "REVEAL") && !quizState.questionData ? (
          <div className="glass-surface p-8 text-center animate-fade-in">
            <p className="text-parchment-dim m-0 body-text">Syncing game state...</p>
          </div>
        ) : null}
        {quizState?.gameState === "RESTARTED" && (
          <div className="flex flex-col items-center justify-center text-center px-4 min-h-dvh animate-fade-in">
            <h2 className="text-3xl heading-text text-crimson mb-4 m-0">GAME RESTARTED</h2>
            <p className="text-parchment-dim body-text m-0 mb-2">The host has restarted the quiz.</p>
            <p className="text-parchment-dim body-text m-0">Please wait for the host to start again.</p>
          </div>
        )}
        {quizState?.gameState === "COMPLETED" && (
          <QuizComplete score={quizState.score} house={quizState.house} />
        )}
      </main>
    </div>
  );
}
