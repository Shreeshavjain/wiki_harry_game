"use client";

interface WaitingScreenProps {
  state: "WAITING" | "QUESTIONS_READY";
}

export default function WaitingScreen({ state }: WaitingScreenProps) {
  return (
    <div className="glass-surface max-w-lg w-full p-10 text-center animate-fade-in flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden">
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-gold/20 opacity-50 rounded-tl-xl" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-gold/20 opacity-50 rounded-br-xl" />

      <div className="mb-8 relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 border-t border-b border-gold rounded-full animate-[spin_4s_linear_infinite] opacity-30 shadow-[0_0_15px_rgba(201,162,39,0.2)]" />
        <div className="absolute inset-3 border-l border-r border-gold-bright rounded-full animate-[spin_3s_linear_infinite_reverse] opacity-50" />
        <span className="text-4xl animate-pulse">⏳</span>
      </div>
      
      <h2 className="heading-text text-2xl sm:text-3xl tracking-[0.2em] text-gold-bright m-0 mb-4 drop-shadow-[0_0_10px_rgba(201,162,39,0.3)]">
        {state === "WAITING" ? "AWAITING QUESTIONS" : "GET READY"}
      </h2>
      
      <p className="text-parchment-dim body-text m-0 text-sm sm:text-base opacity-80 max-w-[280px] leading-relaxed tracking-wider">
        {state === "WAITING" 
          ? "The game master is preparing the challenge..."
          : "The questions are set. The tournament is about to begin. Prepare yourself!"}
      </p>
    </div>
  );
}
