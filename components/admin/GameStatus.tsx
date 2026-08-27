"use client";

interface GameStatusProps {
  roundNumber: number;
  gameState: string;
  questionCount: number;
}

export default function GameStatus({ roundNumber, gameState, questionCount }: GameStatusProps) {
  // Placeholder for real-time quiz status
  // When quiz engine is implemented, this will show current question, time remaining, etc.
  return (
    <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-5 py-4 mb-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div>
          <h3 className="font-[family-name:var(--font-cinzel)] tracking-[0.1em] text-gold-bright m-0 text-lg">
            ROUND {roundNumber}
          </h3>
          <p className="text-parchment-dim text-xs tracking-wider uppercase m-0 mt-1">
            {gameState === "WAITING" && "Waiting for questions"}
            {gameState === "QUESTIONS_READY" && `${questionCount} Questions Ready`}
            {gameState === "LIVE" && "Quiz is Live"}
            {gameState === "COMPLETED" && "Quiz Completed"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {gameState === "LIVE" ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39ff14]"></span>
              </span>
              <span className="text-[0.75rem] font-bold tracking-widest text-[#39ff14] uppercase">
                LIVE
              </span>
            </>
          ) : (
            <span className="text-[0.75rem] font-bold tracking-widest text-parchment-dim uppercase opacity-60">
              {gameState}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
