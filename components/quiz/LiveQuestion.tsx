"use client";

import { useState, useEffect } from "react";
import type { QuizState } from "./QuizApp";

interface LiveQuestionProps {
  quizState: QuizState;
  usn: string;
  onStateRefresh: () => void;
}

export default function LiveQuestion({ quizState, usn, onStateRefresh }: LiveQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    isCorrect: boolean;
    pointsAwarded: number;
    correctRank: number | null;
  } | null>(null);

  const { questionData, questionStartedAt, questionEndsAt, hasAnswered } = quizState;

  // Handle timer
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isCountdown, setIsCountdown] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      if (quizState.gameState === "PAUSED") {
        setIsCountdown(false);
        setTimeLeft(Math.ceil((quizState.frozenRemainingMs || 0) / 1000));
        return;
      }

      const now = new Date().getTime();
      const start = questionStartedAt ? new Date(questionStartedAt).getTime() : 0;
      const end = questionEndsAt ? new Date(questionEndsAt).getTime() : 0;

      if (now < start) {
        setIsCountdown(true);
        setTimeLeft(Math.ceil((start - now) / 1000));
      } else {
        setIsCountdown(false);
        const remaining = Math.max(0, Math.ceil((end - now) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0 && !hasAnswered) {
          // Time up! Try to refresh state soon.
          setTimeout(onStateRefresh, 1000);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [questionStartedAt, questionEndsAt, hasAnswered, onStateRefresh]);

  // Reset local state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setSubmittedResult(null);
    setIsSubmitting(false);
  }, [quizState.currentQuestion]);

  // If already answered but we don't have local result, we just lock it.
  // We can't show the exact points if they refreshed, but we know they can't submit again.
  // The UI will just show "Answer Locked".

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting || hasAnswered) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usn,
          questionNumber: questionData!.questionNumber,
          selectedOption,
          quizAttempt: quizState.quizAttempt || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      
      setSubmittedResult({
        isCorrect: data.isCorrect,
        pointsAwarded: data.pointsAwarded,
        correctRank: data.correctRank,
      });
      onStateRefresh(); // Update score and hasAnswered
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  if (!questionData) return null;

  if (isCountdown && quizState.gameState !== "PAUSED") {
    return (
      <div className="flex flex-col items-center justify-center animate-pulse-fast">
        <h2 className="text-8xl heading-text font-bold text-gold-bright [text-shadow:0_0_30px_rgba(201,162,39,0.8)] m-0">
          {timeLeft > 0 ? timeLeft : "GO!"}
        </h2>
      </div>
    );
  }

  const isLocked = hasAnswered || submittedResult !== null || timeLeft === 0 || quizState.gameState === "PAUSED" || quizState.gameState === "TIME_UP" || quizState.gameState === "REVEAL";

  return (
    <div className="w-full max-w-4xl flex flex-col items-center animate-fade-in-up pb-12 relative pt-8">
      {quizState.gameState === "PAUSED" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
          <div className="glass-surface p-8 text-center animate-scale-in border-orange-500/30">
            <h3 className="text-2xl heading-text text-orange-400 mb-2 m-0">QUIZ PAUSED</h3>
            <p className="text-parchment-dim body-text m-0">Your host has temporarily paused the quiz.</p>
          </div>
        </div>
      )}

      {/* Tournament HUD */}
      <div className="w-full flex items-end justify-between mb-8 px-2 sm:px-6 border-b border-white/5 pb-4 relative">
        <div className="flex flex-col items-start z-10">
          <span className="text-[0.65rem] tracking-[0.3em] uppercase text-parchment-dim mb-1 body-text">Current</span>
          <div className="text-xl sm:text-2xl heading-text text-gold-bright tracking-widest drop-shadow-[0_0_10px_rgba(201,162,39,0.3)]">
            Q{String(questionData.questionNumber).padStart(2, '0')}
          </div>
        </div>

        {/* Central Timer */}
        <div className="absolute left-1/2 bottom-2 sm:bottom-4 -translate-x-1/2 flex flex-col items-center z-10">
          <span className="text-[0.6rem] tracking-[0.2em] uppercase text-parchment-dim mb-1 opacity-70 hidden sm:block body-text">Time Remaining</span>
          <div className={`text-4xl sm:text-5xl font-light data-text ${timeLeft <= 10 ? 'text-crimson drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110' : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'} transition-all duration-300`}>
            {timeLeft}
          </div>
        </div>


        {/* Magical Timer Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5 overflow-hidden">
           <div 
             className="h-full bg-gradient-to-r from-transparent via-[var(--house-accent)] to-white transition-all duration-500 ease-linear shadow-[0_0_10px_var(--house-accent)]" 
             style={{ width: `${(timeLeft / 60) * 100}%` }}
           />
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-surface w-full p-8 sm:p-12 mb-10 relative overflow-hidden flex items-center justify-center min-h-[160px]">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/20 opacity-50 rounded-tl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/20 opacity-50 rounded-br-xl" />
        
        <h2 className="text-2xl sm:text-3xl md:text-4xl display-text leading-relaxed m-0 text-center text-white drop-shadow-lg tracking-wide font-medium">
          {questionData.question}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10">
        {(["A", "B", "C", "D"] as const).map((opt) => {
          const text = questionData[`option_${opt.toLowerCase()}` as keyof typeof questionData];
          const isSelected = selectedOption === opt;
          
          let stateClass = "border-white/10 hover:border-white/30 bg-[rgba(12,16,32,0.5)] hover:bg-[rgba(255,255,255,0.05)] cursor-pointer group";
          
          if (isSelected) {
            stateClass = "border-[var(--house-accent)] bg-[var(--house-c2)] shadow-[0_0_20px_color-mix(in_srgb,var(--house-accent)_20%,transparent)] -translate-y-1";
          }

          if (isLocked) {
             stateClass = isSelected ? "border-[var(--house-accent)] bg-white/10 cursor-not-allowed opacity-80 shadow-[0_0_15px_color-mix(in_srgb,var(--house-accent)_20%,transparent)]" : "border-white/5 bg-black/40 opacity-40 cursor-not-allowed";
          }

          return (
            <button
              key={opt}
              disabled={isLocked}
              onClick={() => setSelectedOption(opt)}
              className={`text-left p-5 sm:p-6 rounded-2xl backdrop-blur-md transition-all duration-300 flex items-center gap-5 relative overflow-hidden ${stateClass}`}
            >
              {isSelected && !isLocked && (
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--house-accent)] to-transparent opacity-10 animate-[shimmer_2s_infinite]" />
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold heading-text shrink-0 transition-colors text-lg ${
                isSelected 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'bg-black/40 text-parchment-dim border border-white/10 group-hover:text-white'
              }`}>
                {opt}
              </div>
              <div className={`text-base sm:text-lg body-text leading-snug transition-colors ${isSelected || isLocked ? 'text-white' : 'text-parchment-dim group-hover:text-white'}`}>
                {text as string}
              </div>
            </button>
          );
        })}
      </div>

      <div className="min-h-[140px] flex items-center justify-center w-full">
        {quizState.gameState === "REVEAL" ? (
          <div className="glass-surface px-8 py-6 text-center border-emerald-500/30 animate-scale-in">
            <div className="text-emerald-400 text-xl sm:text-2xl heading-text font-bold mb-2 tracking-widest drop-shadow-md">
              ANSWER REVEALED
            </div>
            <div className="text-white text-lg tracking-wide body-text">
              Correct answer:<br />
              <span className="font-bold text-emerald-400 text-2xl heading-text">{questionData.correct_option}</span> — {questionData[`option_${questionData.correct_option?.toLowerCase() as "a"|"b"|"c"|"d"}`]}
            </div>
          </div>
        ) : quizState.gameState === "TIME_UP" ? (
          <div className="glass-surface px-8 py-6 text-center border-orange-500/30 animate-scale-in">
            <div className="text-orange-400 text-xl sm:text-2xl heading-text font-bold mb-2 tracking-widest drop-shadow-md">
              TIME'S UP!
            </div>
            <div className="text-parchment-dim body-text text-sm tracking-wide">
              Waiting for the admin to reveal the answer...
            </div>
          </div>
        ) : hasAnswered || submittedResult ? (
          <div className="glass-surface px-8 py-6 text-center border-white/10 animate-scale-in">
            <div className="text-white text-xl heading-text font-bold mb-3 tracking-widest drop-shadow-sm flex items-center justify-center gap-2">
              <span>🔒</span> ANSWER LOCKED
            </div>
            <div className="text-parchment-dim body-text text-sm tracking-wide leading-relaxed">
              Your answer has been recorded.<br />
              <span className="opacity-70 mt-1 inline-block">Waiting for the admin to reveal the answer...</span>
            </div>
          </div>
        ) : timeLeft === 0 ? (
          <div className="glass-surface px-8 py-4 text-center text-rose-400 body-text tracking-[0.2em] uppercase text-sm border-rose-500/20">
            Time Expired
          </div>
        ) : (
          <button
            className="btn-magic shimmer-effect w-full sm:w-auto min-w-[280px] py-4 text-lg animate-scale-in"
            disabled={!selectedOption || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Submitting..." : "Submit Answer"}
          </button>
        )}
      </div>
    </div>
  );
}
