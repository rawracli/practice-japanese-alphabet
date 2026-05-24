import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CategorySelector from "../components/CategorySelector";
import { getOverallStats } from "../utils/storage";
import { kanaData } from "../data/kanaData";

export default function Home({
  config,
  setConfig,
  totalSelected,
  selectedFont,
  setSelectedFont
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const stats = getOverallStats();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (location.state?.showSelectionError) {
      const timer = setTimeout(() => {
        setShowError(true);
        navigate("/", { replace: true, state: {} });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate]);

  const formatTime = (secs) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const launchHiraganaPreset = () => {
    const ids = kanaData
      .filter((char) => char.script === "hiragana" && char.group === "main")
      .map((char) => char.id);
    setConfig(ids);
    navigate("/quiz");
  };

  const launchKatakanaPreset = () => {
    const ids = kanaData
      .filter((char) => char.script === "katakana" && char.group === "main")
      .map((char) => char.id);
    setConfig(ids);
    navigate("/quiz");
  };

  const handleStartSession = () => {
    if (totalSelected === 0) return;
    navigate("/quiz");
  };

  return (
    <div className="space-y-12 py-4">
      {/* Alert toast for empty selection */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="max-w-2xl mx-auto p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-sm text-center flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.1)] gap-3"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Please select at least one kana before starting the quiz.</span>
            </div>
            <button
              onClick={() => setShowError(false)}
              className="text-red-400/60 hover:text-red-400 text-xs uppercase font-extrabold tracking-wider transition-colors duration-150 p-1 rounded hover:bg-red-500/10 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Welcome Segment */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight leading-none">
          JAPANESE <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-blue-500 drop-shadow-[0_0_15px_rgba(56,189,248,0.25)]">KANA PRACTICE</span>
        </h1>
        <p className="text-slate-400 text-sm font-medium max-w-md mx-auto">
          Master Hiragana and Katakana characters through a fast-paced romaji keyboard typing trainer. Fully offline, customizable, and stats-driven.
        </p>
      </div>

      {/* Primary Landing Selection Preset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Practice Hiragana card */}
        <button
          onClick={launchHiraganaPreset}
          type="button"
          className="group relative p-8 rounded-3xl border border-slate-800 hover:border-brand-accent bg-brand-card/50 hover:bg-brand-card/75 text-left transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between aspect-[1.8/1] md:aspect-auto"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-bl-full group-hover:bg-brand-accent/10 transition-all duration-300" />
          <div className="space-y-2">
            <span className="text-5xl font-extrabold text-slate-700 group-hover:text-brand-accent/30 transition-all duration-300 block">あ</span>
            <h2 className="text-2xl font-black text-slate-100 group-hover:text-brand-accent transition-all duration-300">
              Practice Hiragana
            </h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Launch basic Hiragana main practice immediately. Best for starting out with standard sounds.
            </p>
          </div>
          <div className="text-xs font-black uppercase tracking-wider text-brand-accent flex items-center gap-1.5 mt-6">
            Quick Start
            <svg className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Practice Katakana card */}
        <button
          onClick={launchKatakanaPreset}
          type="button"
          className="group relative p-8 rounded-3xl border border-slate-800 hover:border-brand-accent bg-brand-card/50 hover:bg-brand-card/75 text-left transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between aspect-[1.8/1] md:aspect-auto"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full group-hover:bg-blue-500/10 transition-all duration-300" />
          <div className="space-y-2">
            <span className="text-5xl font-extrabold text-slate-700 group-hover:text-blue-400/30 transition-all duration-300 block">ア</span>
            <h2 className="text-2xl font-black text-slate-100 group-hover:text-blue-400 transition-all duration-300">
              Practice Katakana
            </h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Launch basic Katakana main practice immediately. Master the angular symbols used for foreign loanwords.
            </p>
          </div>
          <div className="text-xs font-black uppercase tracking-wider text-brand-accent flex items-center gap-1.5 mt-6">
            Quick Start
            <svg className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-brand-card/20 glass-panel">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-4 text-center sm:text-left">
          Lifetime Training Records
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Sessions</span>
            <span className="text-2xl font-black text-slate-200">{stats.totalSessions}</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Highest Score</span>
            <span className="text-2xl font-black text-brand-accent drop-shadow-[0_0_8px_rgba(56,189,248,0.15)]">
              {stats.highestScore}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Best Accuracy</span>
            <span className="text-2xl font-black text-slate-200">
              {stats.totalSessions > 0 ? `${(stats.highestAccuracy * 100).toFixed(0)}%` : "0%"}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Fastest Completion</span>
            <span className="text-2xl font-black text-slate-200 font-mono">
              {formatTime(stats.fastestTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Manual Configuration Area */}
      <div className="p-6 md:p-8 rounded-3xl border border-slate-800 bg-brand-card/30 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-black text-slate-200">Custom Training Session</h2>
            <p className="text-xs text-slate-400">Configure your specific combination of scripts and groups below.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate("/leaderboard")}
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Leaderboard
            </button>
            
            <button
              onClick={handleStartSession}
              type="button"
              disabled={totalSelected === 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs transition-all duration-300 shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:shadow-[0_0_25px_rgba(56,189,248,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Start Session
              <svg className="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        <CategorySelector
          config={config}
          onChange={setConfig}
          totalSelected={totalSelected}
          selectedFont={selectedFont}
          setSelectedFont={setSelectedFont}
        />
      </div>
    </div>
  );
}
