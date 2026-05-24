import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { getGrade } from "../utils/scoring";

export default function ResultModal({
  stats,
  isPB,
  onRetry,
  onBackToMenu,
  onViewLeaderboard
}) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animated score counter effect
  useEffect(() => {
    let start = 0;
    const end = stats.score;
    if (end === 0) return;
    
    const duration = 1000; // 1 second
    const stepTime = Math.max(Math.floor(duration / end), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / 40); // Increment
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [stats.score]);

  const grade = getGrade(stats.accuracy);

  // Format time (seconds) into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-4xl mx-auto p-6 md:p-8 rounded-3xl border border-slate-800 bg-brand-card/80 glass-panel space-y-8 select-none"
    >
      {/* Header Banner */}
      <div className="text-center space-y-2 relative">
        {isPB && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
            className="inline-block px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 font-extrabold text-xs tracking-widest uppercase mb-2 animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            🏆 New Personal Best! 🏆
          </motion.div>
        )}
        <h2 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight">
          Session Completed!
        </h2>
        <p className="text-sm text-slate-400 font-semibold tracking-wide uppercase">
          Config: <span className="text-brand-accent">{stats.configName}</span>
        </p>

        {stats.isCustom && (
          <div className="mt-4 max-w-md mx-auto p-4 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-2.5 text-left shadow-[0_0_20px_rgba(56,189,248,0.05)]">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Custom Selection Details</span>
              <span className="px-1.5 py-0.5 rounded bg-brand-accent/15 border border-brand-accent/30 text-brand-accent shadow-[0_0_8px_rgba(56,189,248,0.1)]">
                {stats.selectedCount || stats.totalQuestions} Chars
              </span>
            </div>
            
            {/* Script & Group tags */}
            <div className="flex flex-wrap gap-1.5">
              {stats.scriptList && stats.scriptList.map(s => (
                <span key={s} className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-900 border border-slate-800 text-slate-400">
                  {s}
                </span>
              ))}
              {stats.groupList && stats.groupList.map(g => (
                <span key={g} className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-900/60 border border-slate-900/60 text-slate-500">
                  {g}
                </span>
              ))}
            </div>

            {/* Exact Kana Preview */}
            {stats.selectedPreview && stats.selectedPreview !== "Legacy Run" && (
              <div className="text-xs text-slate-300 font-medium pt-2 border-t border-slate-900">
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block mb-0.5">Exact Kana Preview:</span>
                <span className="font-mono text-brand-accent/90">{stats.selectedPreview}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Score & Grade Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score Reveal Card */}
        <div className="p-6 md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center space-y-1 relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-brand-accent/5 to-transparent pointer-events-none" />
          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
            Weighted Score
          </span>
          <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-blue-400 leading-none drop-shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            {animatedScore}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Based on time, accuracy, and penalties
          </span>
        </div>

        {/* Grade Badge */}
        <div
          className={clsx(
            "p-6 rounded-2xl border flex flex-col items-center justify-center text-center aspect-square md:aspect-auto md:h-full",
            grade.color
          )}
        >
          <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
            Performance Grade
          </span>
          <div className="text-7xl md:text-8xl font-black tracking-normal leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            {grade.letter}
          </div>
          <span className="text-xs font-semibold mt-2 px-2 py-0.5 rounded bg-slate-900/60 uppercase">
            {(stats.accuracy * 100).toFixed(0)}% Accuracy
          </span>
        </div>
      </div>

      {/* Statistics Detailed Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Questions */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Questions</span>
          <span className="text-xl font-bold text-slate-200">{stats.totalQuestions}</span>
        </div>

        {/* Accuracy */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Accuracy</span>
          <span className="text-xl font-bold text-slate-200">{(stats.accuracy * 100).toFixed(1)}%</span>
        </div>

        {/* Time Elapsed */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Time</span>
          <span className="text-xl font-bold text-slate-200 font-mono">{formatTime(stats.totalTime)}</span>
        </div>

        {/* Average Response Time */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Avg. Pace</span>
          <span className="text-xl font-bold text-slate-200 font-mono">
            {stats.avgTimePerQuestion.toFixed(1)}s <span className="text-xs text-slate-500">/char</span>
          </span>
        </div>

        {/* Correct Answers */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Correct</span>
          <span className="text-xl font-bold text-emerald-400">{stats.correctAnswers}</span>
        </div>

        {/* Wrong Attempts */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Mistakes</span>
          <span className="text-xl font-bold text-rose-400">{stats.wrongAttempts}</span>
        </div>

        {/* Final Streak */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Final Streak</span>
          <span className="text-xl font-bold text-slate-200">{stats.streak}</span>
        </div>

        {/* Best Streak */}
        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Best Streak</span>
          <span className="text-xl font-bold text-orange-400">{stats.bestStreak}</span>
        </div>
      </div>

      {/* Mistake Review Panel */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40">
        <h3 className="font-bold text-slate-200 text-base mb-4 flex items-center gap-2">
          <span>Review Mistakes</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            {stats.missedKana.length} items
          </span>
        </h3>
        
        {stats.missedKana.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm font-medium flex flex-col items-center gap-2">
            <span className="text-3xl">🎉</span>
            <span>Flawless Victory! No mistakes to review. Perfect Hiragana & Katakana skill.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-h-48 overflow-y-auto pr-2 no-scrollbar">
            {stats.missedKana.map((item, index) => (
              <div
                key={`${item.kana}_${index}`}
                className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center text-center space-y-0.5"
              >
                <div className="text-2xl font-black text-slate-100">{item.kana}</div>
                <div className="text-xs font-extrabold text-brand-accent uppercase tracking-wider">
                  {item.romaji}
                </div>
                <div className="text-[9px] text-slate-500 font-medium">
                  {item.script}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nav Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBackToMenu}
          type="button"
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Menu
        </motion.button>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onViewLeaderboard}
            type="button"
            className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-brand-accent hover:text-cyan-300 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Leaderboard
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            type="button"
            className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-accent to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 transition-all duration-300 shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-950 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.005a1 1 0 01.94 1.056 5.002 5.002 0 008.053 3.839H10a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 011.009-1.328z" clipRule="evenodd" />
            </svg>
            Retry Quiz
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
