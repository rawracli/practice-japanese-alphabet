import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LeaderboardTable from "../components/LeaderboardTable";
import { getLeaderboard, getOverallStats, clearAllData } from "../utils/storage";

export default function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({});
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Load stats and history on mount
  useEffect(() => {
    const fetchRecords = async () => {
      setEntries(getLeaderboard());
      setStats(getOverallStats());
    };
    fetchRecords();
  }, []);

  const formatTime = (secs) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleResetData = () => {
    clearAllData();
    setEntries([]);
    setStats({
      totalSessions: 0,
      highestAccuracy: 0,
      fastestTime: null,
      highestScore: 0
    });
    setShowConfirmReset(false);
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight leading-none">
            PERSONAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-blue-500 drop-shadow-[0_0_15px_rgba(56,189,248,0.25)]">RECORDS</span>
          </h1>
          <p className="text-xs text-slate-400">
            Review your best times, scores, and accuracies across different practices.
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/")}
          type="button"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Dashboard
        </motion.button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="p-5 rounded-2xl border border-slate-800/80 bg-brand-card/30 glass-panel text-center space-y-1"
        >
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Sessions Played</span>
          <span className="text-3xl font-black text-slate-200">{stats.totalSessions || 0}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="p-5 rounded-2xl border border-slate-800/80 bg-brand-card/30 glass-panel text-center space-y-1"
        >
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Highest Score Record</span>
          <span className="text-3xl font-black text-brand-accent drop-shadow-[0_0_8px_rgba(56,189,248,0.15)]">
            {stats.highestScore || 0}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="p-5 rounded-2xl border border-slate-800/80 bg-brand-card/30 glass-panel text-center space-y-1"
        >
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Best Accuracy achieved</span>
          <span className="text-3xl font-black text-slate-200">
            {stats.totalSessions > 0 ? `${(stats.highestAccuracy * 100).toFixed(0)}%` : "0%"}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="p-5 rounded-2xl border border-slate-800/80 bg-brand-card/30 glass-panel text-center space-y-1"
        >
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Fastest Valid Completion</span>
          <span className="text-3xl font-black text-slate-200 font-mono">
            {formatTime(stats.fastestTime)}
          </span>
        </motion.div>
      </div>

      {/* Leaderboard Table Component */}
      <div className="p-6 md:p-8 rounded-3xl border border-slate-800 bg-brand-card/10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-extrabold text-slate-200">Historical Records</h2>
          <span className="text-xs text-slate-500 font-medium">{entries.length} runs cataloged</span>
        </div>

        <LeaderboardTable entries={entries} />
      </div>

      {/* Danger Zone Controls */}
      <div className="p-6 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left space-y-1">
          <h4 className="font-extrabold text-slate-300">Reset Local History</h4>
          <p className="text-xs text-slate-500">
            Warning: This action will permanently wipe all local leaderboards and personal best records.
          </p>
        </div>
        
        <div className="relative">
          <AnimatePresence mode="wait">
            {showConfirmReset ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <button
                  onClick={() => setShowConfirmReset(false)}
                  type="button"
                  className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  type="button"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-slate-100 transition-all duration-150 cursor-pointer"
                >
                  Yes, Clear Everything
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="trigger"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShowConfirmReset(true)}
                type="button"
                disabled={entries.length === 0}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-rose-500/20 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-bold text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                Clear Records
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
