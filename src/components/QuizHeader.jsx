
import FontDropdown from "./FontDropdown";

export default function QuizHeader({
  modeName,
  currentIndex,
  totalQuestions,
  time,
  streak,
  isMuted,
  onToggleMute,
  onFinish,
  selectedFont,
  setSelectedFont,
  isPaused,
  onPauseToggle
}) {
  // Format elapsed time (seconds) into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Determine streak multiplier glow
  const getStreakStyles = () => {
    if (streak === 0) return "text-slate-500 border-slate-900";
    if (streak < 5) return "text-cyan-400 border-cyan-500/20 bg-cyan-500/5";
    if (streak < 10) return "text-teal-400 border-teal-500/30 bg-teal-500/10 shadow-[0_0_10px_rgba(20,184,166,0.15)]";
    return "text-orange-400 border-orange-500/50 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-pulse";
  };

  return (
    <div className="w-full flex items-center justify-between gap-1.5 sm:gap-4 p-2 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/40 glass-panel">
      {/* Quiz Mode Details */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFinish}
          type="button"
          className="flex items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-200"
          title="Exit Practice"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="hidden sm:block">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Mode</span>
          <span className="font-extrabold text-slate-200 text-xs md:text-base leading-tight">
            {modeName}
          </span>
        </div>
      </div>

      {/* Dynamic stats */}
      <div className="flex items-center gap-1.5 sm:gap-4 md:gap-6">
        {/* Progress Counter */}
        <div className="text-center bg-slate-900/60 border border-slate-900 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1 sm:py-2">
          <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Prog</span>
          <span className="font-mono text-xs sm:text-sm md:text-base font-bold text-slate-300">
            {currentIndex + 1}<span className="text-slate-600">/</span>{totalQuestions}
          </span>
        </div>

        {/* Stopwatch Timer */}
        <div className="text-center bg-slate-900/60 border border-slate-900 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1 sm:py-2">
          <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Time</span>
          <span className="font-mono text-xs sm:text-sm md:text-base font-bold text-brand-accent">
            {formatTime(time)}
          </span>
        </div>

        {/* Streak Combo */}
        <div className={`text-center border rounded-lg sm:rounded-xl px-2 sm:px-4 py-1 sm:py-2 transition-all duration-300 ${getStreakStyles()}`}>
          <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider block opacity-70">Streak</span>
          <span className="text-xs sm:text-sm md:text-base font-black flex items-center justify-center gap-0.5">
            {streak > 0 && (
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 fill-current" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v1.616a6 6 0 013.605 5.569A5.492 5.492 0 0115 13.5a5.5 5.5 0 01-9.5-3.79c0-1.84 1.085-3.51 2.81-4.32a1 1 0 011.01.077 1 1 0 01.38.798v1.65a2.5 2.5 0 003.6 2.25 1 1 0 011.38.9v.03a1.5 1.5 0 01-2.25 1.3 4.5 4.5 0 01-1.12-1.786 1 1 0 011.025-1.378c.84.053 1.595-.444 1.94-1.218a5.952 5.952 0 00.32-2.128c0-1.573-.61-3.07-1.705-4.175a1 1 0 01-.225-1.146z" />
              </svg>
            )}
            {streak}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Font Changer - hidden on mobile viewports */}
        <div className="hidden sm:block">
          <FontDropdown selectedFont={selectedFont} onFontChange={setSelectedFont} />
        </div>

        {/* Pause Button */}
        <button
          onClick={onPauseToggle}
          type="button"
          className="flex items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
          title={isPaused ? "Resume Practice (Esc)" : "Pause Practice (Esc)"}
        >
          {isPaused ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>

        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          type="button"
          className="flex items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
        >
          {isMuted ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
