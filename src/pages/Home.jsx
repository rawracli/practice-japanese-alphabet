import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CategorySelector from "../components/CategorySelector";
import {
  getOverallStats,
  getQuizConfig,
  loadRecoverySession,
  clearRecoverySession,
  migrateLocalStorage,
  clearSrsData,
  clearLeaderboard,
  clearAnalytics,
  clearTheme
} from "../utils/storage";
import { getSrsAnalysis, loadSrsData } from "../utils/srs";
import { kanaData } from "../data/kanaData";
import { getFontClassName } from "../utils/fonts";
import clsx from "clsx";

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
  
  // States
  const [showError, setShowError] = useState(false);
  const [srsAnalysis, setSrsAnalysis] = useState(() => getSrsAnalysis());
  const [srsData, setSrsData] = useState(() => loadSrsData());
  const [recoveryData, setRecoveryData] = useState(null);
  
  // Heatmap Filters
  const [heatmapScript, setHeatmapScript] = useState("ALL"); // 'ALL' | 'hiragana' | 'katakana'
  const [heatmapGroup, setHeatmapGroup] = useState("ALL"); // 'ALL' | 'main' | 'dakuten' | 'combination'
  const [selectedHeatmapChar, setSelectedHeatmapChar] = useState(null); // Click to view details on mobile

  // Migrate schema and check for interrupted session on mount
  useEffect(() => {
    migrateLocalStorage();
    const recovery = loadRecoverySession();
    if (recovery) {
      setRecoveryData(recovery);
    }
  }, []);

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
    if (secs === null || secs === undefined) return "--:--";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
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

  // Resolve visual intensity for a given kana (memoized for rendering optimization)
  const getMasteryColor = (charId) => {
    const record = srsData[charId];
    if (!record || record.totalAttempts === 0) {
      return "bg-slate-900/40 border-slate-900 text-slate-500 hover:border-slate-800"; // gray / unpracticed
    }
    
    const accuracy = record.correctAnswers / record.totalAttempts;

    if (accuracy >= 0.85) {
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:border-emerald-400"; // green / strong
    }
    if (accuracy >= 0.50) {
      return "bg-yellow-500/10 border-yellow-500/25 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.05)] hover:border-yellow-400"; // yellow / medium
    }
    return "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)] hover:border-rose-400"; // red / weak
  };

  // Filtered Kana list for Heatmap (memoized to prevent unneeded recalculations)
  const filteredHeatmapKana = useMemo(() => {
    return kanaData.filter(char => {
      if (heatmapScript !== "ALL" && char.script !== heatmapScript) return false;
      if (heatmapGroup !== "ALL" && char.group !== heatmapGroup) return false;
      return true;
    });
  }, [heatmapScript, heatmapGroup]);

  // Set default selected character in details tab if not set (memoized safe layout)
  useEffect(() => {
    if (filteredHeatmapKana.length > 0 && !selectedHeatmapChar) {
      setSelectedHeatmapChar(filteredHeatmapKana[0]);
    }
  }, [filteredHeatmapKana, selectedHeatmapChar]);

  const selectedCharRecord = useMemo(() => {
    if (!selectedHeatmapChar) return null;
    return srsData[selectedHeatmapChar.id] || {
      totalAttempts: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      currentStreak: 0,
      bestStreak: 0,
      avgResponseTime: 0,
      lastPracticed: null
    };
  }, [selectedHeatmapChar, srsData]);

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
            className="max-w-2xl mx-auto p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-sm text-center flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.1)] gap-3 animate-bounce"
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

      {/* Interrupted Session Recovery Dialog Modal */}
      <AnimatePresence>
        {recoveryData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-8 rounded-3xl border border-brand-accent/20 bg-brand-card/95 shadow-[0_0_50px_rgba(56,189,248,0.15)] text-center space-y-6"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center mx-auto text-brand-accent text-2xl">
                  💾
                </div>
                <h2 className="text-2xl font-black text-slate-100 tracking-tight">Resume Session?</h2>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  We discovered an unfinished practice session. Would you like to pick up exactly where you left off?
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-900 bg-slate-950/40 text-left text-xs font-semibold space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-500 uppercase text-[9px] tracking-wider font-bold">Practice Mode</span>
                  <span className="text-slate-200 font-bold">
                    {recoveryData.activeConfig ? getQuizConfig(recoveryData.activeConfig).configName : "Custom Selection"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-500 uppercase text-[9px] tracking-wider font-bold">Completed Card</span>
                  <span className="text-brand-accent font-black">
                    {recoveryData.currentIndex} / {recoveryData.kanaList.length} completed
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 uppercase text-[9px] tracking-wider font-bold">Session Time</span>
                  <span className="text-slate-200 font-mono">
                    {Math.floor(recoveryData.time / 60).toString().padStart(2, "0")}:{(recoveryData.time % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    navigate("/quiz", { state: { resumeSession: true } });
                  }}
                  type="button"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-accent to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs transition-all duration-300 shadow-[0_0_15px_rgba(56,189,248,0.2)] hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] cursor-pointer"
                >
                  Resume Practice
                </button>
                
                <button
                  onClick={() => {
                    clearRecoverySession();
                    setRecoveryData(null);
                  }}
                  type="button"
                  className="w-full py-3 rounded-xl border border-rose-950/20 bg-rose-950/10 hover:bg-rose-900/20 text-xs font-bold text-rose-400 hover:text-rose-350 transition-all duration-200 cursor-pointer"
                >
                  Discard & Start Fresh
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Welcome Segment */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-100 tracking-tight leading-none">
          JAPANESE <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-blue-500 drop-shadow-[0_0_15px_rgba(56,189,248,0.25)]">KANA PRACTICE</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-md mx-auto leading-relaxed px-4">
          Master Hiragana and Katakana characters through a fast-paced romaji keyboard typing trainer. Adaptive spaced repetition weights focus on your weak points.
        </p>
      </div>

      {/* Primary Landing Selection Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-2 sm:px-0">
        {/* Practice Hiragana card */}
        <button
          onClick={launchHiraganaPreset}
          type="button"
          className="group relative p-6 sm:p-8 rounded-3xl border border-slate-800 hover:border-brand-accent bg-brand-card/50 hover:bg-brand-card/75 text-left transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between aspect-[1.8/1] sm:aspect-auto"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-bl-full group-hover:bg-brand-accent/10 transition-all duration-300" />
          <div className="space-y-2">
            <span className="text-4xl sm:text-5xl font-extrabold text-slate-700 group-hover:text-brand-accent/30 transition-all duration-300 block">あ</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 group-hover:text-brand-accent transition-all duration-300">
              Practice Hiragana
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs leading-relaxed">
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
          className="group relative p-6 sm:p-8 rounded-3xl border border-slate-800 hover:border-brand-accent bg-brand-card/50 hover:bg-brand-card/75 text-left transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between aspect-[1.8/1] sm:aspect-auto"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full group-hover:bg-blue-500/10 transition-all duration-300" />
          <div className="space-y-2">
            <span className="text-4xl sm:text-5xl font-extrabold text-slate-700 group-hover:text-blue-400/30 transition-all duration-300 block">ア</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 group-hover:text-blue-400 transition-all duration-300">
              Practice Katakana
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs leading-relaxed">
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

      {/* Spaced Repetition Mastery Analytics Summary */}
      {srsAnalysis.totalPracticedCount > 0 && (
        <div className="p-6 rounded-3xl border border-slate-800 bg-brand-card/15 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-200 text-sm sm:text-base flex items-center gap-2">
              <span>📊 Spaced Repetition Mastery Insights</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                {srsAnalysis.totalPracticedCount} Chars Practiced
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">We analyze your typing accuracy and streaking to pinpoint weak spots.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Hardest Kana (Weak Spots) */}
            <div className="p-4 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] space-y-3">
              <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🌋</span> Top Weak Spots (High weight)
              </h4>
              <div className="space-y-2">
                {srsAnalysis.hardestKana.map((item, idx) => (
                  <div key={`${item.id}_${idx}`} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-900 text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className={`text-base font-black ${getFontClassName(selectedFont)}`}>{item.kana}</span>
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase">({item.romaji})</span>
                    </span>
                    <span className="font-mono text-[10px] text-rose-400 font-bold bg-rose-950/20 px-2 py-0.5 rounded">
                      Weight: {item.difficultyWeight.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Missed Kana */}
            <div className="p-4 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] space-y-3">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>❌</span> Most Missed Kana (Mistakes count)
              </h4>
              <div className="space-y-2">
                {srsAnalysis.mostMissedKana.map((item, idx) => (
                  <div key={`${item.id}_${idx}`} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-900 text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className={`text-base font-black ${getFontClassName(selectedFont)}`}>{item.kana}</span>
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase">({item.romaji})</span>
                    </span>
                    <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-950/20 px-2 py-0.5 rounded">
                      {item.wrongAnswers} mistakes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Mastered Kana */}
            <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] space-y-3">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏆</span> Best Mastered Kana (Strongest)
              </h4>
              <div className="space-y-2">
                {srsAnalysis.bestMasteredKana.map((item, idx) => (
                  <div key={`${item.id}_${idx}`} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-900 text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className={`text-base font-black ${getFontClassName(selectedFont)}`}>{item.kana}</span>
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase">({item.romaji})</span>
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded">
                      Streak: {item.currentStreak} 🔥
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEATMAP / PRACTICE ANALYTICS SECTION */}
      <div className="p-6 md:p-8 rounded-3xl border border-slate-800 bg-brand-card/25 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-xl font-black text-slate-200 flex items-center gap-2 justify-center md:justify-start">
              <span>🎯 Kana Mastery Matrix Heatmap</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Visualize your kana progress. Tap any character card to examine precise response statistics.</p>
          </div>

          {/* Filtering Tools */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Script Filter Select */}
            <select
              value={heatmapScript}
              onChange={(e) => setHeatmapScript(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-850 bg-slate-950 text-xs font-bold text-slate-300 outline-none focus:border-brand-accent cursor-pointer"
            >
              <option value="ALL">All Scripts</option>
              <option value="hiragana">Hiragana</option>
              <option value="katakana">Katakana</option>
            </select>

            {/* Group Filter Select */}
            <select
              value={heatmapGroup}
              onChange={(e) => setHeatmapGroup(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-850 bg-slate-950 text-xs font-bold text-slate-300 outline-none focus:border-brand-accent cursor-pointer"
            >
              <option value="ALL">All Families</option>
              <option value="main">Main Sounds</option>
              <option value="dakuten">Dakuten</option>
              <option value="combination">Combination</option>
            </select>
          </div>
        </div>

        {/* Heatmap Layout Grid & Detailed Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* The contributing squares list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-96 overflow-y-auto pr-2 no-scrollbar p-1">
              {filteredHeatmapKana.map((char) => {
                const isActive = selectedHeatmapChar?.id === char.id;
                return (
                  <button
                    key={char.id}
                    onClick={() => setSelectedHeatmapChar(char)}
                    type="button"
                    className={clsx(
                      "aspect-square rounded-xl border text-base font-bold flex flex-col items-center justify-center transition-all duration-200 transform active:scale-95 cursor-pointer relative",
                      getMasteryColor(char.id),
                      isActive ? "ring-2 ring-brand-accent border-brand-accent scale-105 z-10" : ""
                    )}
                  >
                    <span className={getFontClassName(selectedFont)}>{char.kana}</span>
                    <span className="text-[7px] opacity-60 uppercase leading-none font-bold mt-0.5">{char.romaji}</span>
                  </button>
                );
              })}
            </div>

            {/* Color keys */}
            <div className="flex items-center gap-4 justify-center text-[10px] text-slate-500 font-extrabold uppercase tracking-wider bg-slate-950/20 p-2.5 rounded-xl border border-slate-900/60 max-w-md mx-auto">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-950 inline-block" /> Unpracticed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500/40 inline-block" /> Weak
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/20 border border-yellow-500/40 inline-block" /> Medium
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40 inline-block" /> Mastered
              </span>
            </div>
          </div>

          {/* Metrics Drawer Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 shadow-inner flex flex-col justify-between">
            {selectedHeatmapChar ? (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-900">
                  <div className={`text-6xl font-black text-slate-200 my-2 ${getFontClassName(selectedFont)}`}>
                    {selectedHeatmapChar.kana}
                  </div>
                  <span className="text-xs font-black uppercase text-brand-accent tracking-widest block font-mono">
                    Romaji: {selectedHeatmapChar.romaji}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 text-slate-400 border border-slate-800">
                      {selectedHeatmapChar.script}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 text-slate-500">
                      {selectedHeatmapChar.group}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wide text-[10px]">Total Practices</span>
                    <span className="text-slate-200 font-bold">{selectedCharRecord.totalAttempts}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wide text-[10px]">Correct Reviews</span>
                    <span className="text-emerald-400 font-bold">{selectedCharRecord.correctAnswers}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wide text-[10px]">Mistakes Recorded</span>
                    <span className="text-rose-400 font-bold">{selectedCharRecord.wrongAnswers}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wide text-[10px]">Longest Streak</span>
                    <span className="text-amber-400 font-bold">{selectedCharRecord.bestStreak} 🔥</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wide text-[10px]">Average Pace</span>
                    <span className="text-slate-200 font-mono font-bold">
                      {selectedCharRecord.totalAttempts > 0 
                        ? `${selectedCharRecord.avgResponseTime.toFixed(1)}s` 
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wide text-[10px]">Difficulty Weight</span>
                    <span className="text-rose-400 font-mono font-bold">
                      {selectedCharRecord.totalAttempts > 0 
                        ? (selectedCharRecord.difficultyWeight || 1.0).toFixed(2) 
                        : "1.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-900 pt-2 text-[10px]">
                    <span className="text-slate-500 font-bold uppercase tracking-wide">Last Practiced</span>
                    <span className="text-slate-400 font-semibold truncate max-w-[120px]" title={selectedCharRecord.lastPracticed}>
                      {selectedCharRecord.lastPracticed 
                        ? new Date(selectedCharRecord.lastPracticed).toLocaleDateString() 
                        : "Never"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-semibold text-xs leading-relaxed uppercase">
                Tap any grid tile to load character statistics
              </div>
            )}
            
            <div className="text-[10px] text-slate-600 font-bold text-center border-t border-slate-900 pt-3 mt-4">
              💡 Weighted SRS automatically prioritizes weak items.
            </div>
          </div>
        </div>
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

      {/* Visual Settings Resets Dashboard */}
      <div className="p-6 md:p-8 rounded-3xl border border-slate-800 bg-brand-card/25 space-y-6">
        <div className="border-b border-slate-800 pb-3 text-center sm:text-left">
          <h3 className="font-extrabold text-slate-200 text-sm sm:text-base flex items-center gap-2 justify-center sm:justify-start">
            <span>⚙️ KanaSensei Training Settings & Resets</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage your local storage training logs, weights database, and UI layouts below.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 sm:px-0">
          {/* Wipe SRS Progress */}
          <div className="p-4 rounded-2xl border border-slate-900 bg-slate-950/20 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-black text-amber-400 block uppercase tracking-wider">Mastery Database</span>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Clears SRS weights, streaking records, and response times. Restores base learning pool priorities.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to reset SRS progress? This will reset all your kana mastery levels!")) {
                  clearSrsData();
                  setSrsAnalysis(getSrsAnalysis());
                  setSrsData(loadSrsData());
                  alert("SRS progress reset successfully!");
                }
              }}
              type="button"
              className="w-full py-2 rounded-xl border border-amber-500/20 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-[10px] font-black uppercase text-amber-400 transition-all duration-200 cursor-pointer"
            >
              Reset SRS weights
            </button>
          </div>

          {/* Wipe Leaderboard History */}
          <div className="p-4 rounded-2xl border border-slate-900 bg-slate-950/20 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-black text-rose-400 block uppercase tracking-wider">Practice Records</span>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Wipes all logs of completed runs, historical times, accuracy entries, and completion grades.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear leaderboard history? This will delete all your historical scores!")) {
                  clearLeaderboard();
                  alert("Leaderboard history cleared successfully!");
                }
              }}
              type="button"
              className="w-full py-2 rounded-xl border border-rose-500/20 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-[10px] font-black uppercase text-rose-400 transition-all duration-200 cursor-pointer"
            >
              Wipe Leaderboard
            </button>
          </div>

          {/* Reset Personal Bests */}
          <div className="p-4 rounded-2xl border border-slate-900 bg-slate-950/20 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-black text-blue-400 block uppercase tracking-wider">Analytics & PBs</span>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Clears aggregated high scores and Personal Bests (PBs), restoring stats back to baseline empty states.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to reset PBs and analytics? This will clear all high-score achievements!")) {
                  clearAnalytics();
                  alert("Analytics and PBs reset successfully!");
                  window.location.reload();
                }
              }}
              type="button"
              className="w-full py-2 rounded-xl border border-blue-500/20 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 text-[10px] font-black uppercase text-blue-400 transition-all duration-200 cursor-pointer"
            >
              Reset Analytics
            </button>
          </div>

          {/* Reset Theme Preference */}
          <div className="p-4 rounded-2xl border border-slate-900 bg-slate-950/20 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-black text-purple-400 block uppercase tracking-wider">UI Preferences</span>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Wipes theme selections and restores the application visual style preferences back to default Dark.
              </p>
            </div>
            <button
              onClick={() => {
                clearTheme();
                alert("Theme reset to default Dark theme!");
                window.location.reload();
              }}
              type="button"
              className="w-full py-2 rounded-xl border border-purple-500/20 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 text-[10px] font-black uppercase text-purple-400 transition-all duration-200 cursor-pointer"
            >
              Restore Default Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
