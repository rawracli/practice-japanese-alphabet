import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export default function LeaderboardTable({ entries }) {
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'PRESET' | 'CUSTOM'
  const [filterScript, setFilterScript] = useState("ALL"); // 'ALL' | 'hiragana' | 'katakana' | 'mixed'
  const [filterGroup, setFilterGroup] = useState("ALL"); // 'ALL' | 'main' | 'dakuten' | 'combination' | 'mixed'
  const [filterConfig, setFilterConfig] = useState("ALL"); // 'ALL' | configKey

  const [sortBy, setSortBy] = useState("score"); // 'score' | 'totalTime' | 'accuracy' | 'date'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'

  // Extract unique configuration metadata for filtering
  const uniqueConfigs = useMemo(() => {
    const map = new Map();
    entries.forEach(entry => {
      if (!map.has(entry.configKey)) {
        map.set(entry.configKey, {
          configKey: entry.configKey,
          configName: entry.configName,
          selectedPreview: entry.selectedPreview,
          selectedCount: entry.selectedCount,
          isCustom: entry.isCustom,
          scriptList: entry.scriptList || [],
          groupList: entry.groupList || []
        });
      }
    });
    return Array.from(map.values());
  }, [entries]);

  // Dynamic list of configurations matching the higher-level filters
  const filteredUniqueConfigs = useMemo(() => {
    return uniqueConfigs.filter(cfg => {
      // Filter by type
      if (filterType === "PRESET" && cfg.isCustom) return false;
      if (filterType === "CUSTOM" && !cfg.isCustom) return false;

      // Filter by script
      if (filterScript !== "ALL") {
        const scripts = cfg.scriptList || [];
        if (filterScript === "mixed") {
          if (!(scripts.includes("hiragana") && scripts.includes("katakana"))) return false;
        } else {
          if (!(scripts.includes(filterScript) && scripts.length === 1)) return false;
        }
      }

      // Filter by group
      if (filterGroup !== "ALL") {
        const groups = cfg.groupList || [];
        if (filterGroup === "mixed") {
          if (groups.length <= 1) return false;
        } else {
          if (!(groups.includes(filterGroup) && groups.length === 1)) return false;
        }
      }

      return true;
    });
  }, [uniqueConfigs, filterType, filterScript, filterGroup]);

  // Derive active filter config
  const activeFilterConfig = useMemo(() => {
    if (filterConfig === "ALL") return "ALL";
    const exists = filteredUniqueConfigs.some(cfg => cfg.configKey === filterConfig);
    return exists ? filterConfig : "ALL";
  }, [filteredUniqueConfigs, filterConfig]);

  // Filter and sort entries
  const processedEntries = useMemo(() => {
    let result = [...entries];

    // 1. Filter by Quiz Type (Preset vs Custom)
    if (filterType === "PRESET") {
      result = result.filter((entry) => !entry.isCustom);
    } else if (filterType === "CUSTOM") {
      result = result.filter((entry) => entry.isCustom);
    }

    // 2. Filter by Script
    if (filterScript !== "ALL") {
      result = result.filter((entry) => {
        const scripts = entry.scriptList || [];
        if (filterScript === "mixed") {
          return scripts.includes("hiragana") && scripts.includes("katakana");
        } else {
          return scripts.includes(filterScript) && scripts.length === 1;
        }
      });
    }

    // 3. Filter by Group
    if (filterGroup !== "ALL") {
      result = result.filter((entry) => {
        const groups = entry.groupList || [];
        if (filterGroup === "mixed") {
          return groups.length > 1;
        } else {
          return groups.includes(filterGroup) && groups.length === 1;
        }
      });
    }

    // 4. Filter by specific ConfigKey
    if (activeFilterConfig !== "ALL") {
      result = result.filter((entry) => entry.configKey === activeFilterConfig);
    }

    // 5. Sort
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "date") {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [entries, filterType, filterScript, filterGroup, activeFilterConfig, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      if (field === "totalTime") {
        setSortOrder("asc"); // Faster is better
      } else {
        setSortOrder("desc"); // Higher is better
      }
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="space-y-4 p-5 rounded-2xl border border-slate-900 bg-slate-950/25">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Quiz Type Filter */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="type-filter" className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              Quiz Type
            </label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 outline-none focus:border-brand-accent transition-all duration-200"
            >
              <option value="ALL">All Runs</option>
              <option value="PRESET">Standard Presets</option>
              <option value="CUSTOM">Custom Quizzes</option>
            </select>
          </div>

          {/* 2. Script Filter */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="script-filter" className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              Script Selection
            </label>
            <select
              id="script-filter"
              value={filterScript}
              onChange={(e) => setFilterScript(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 outline-none focus:border-brand-accent transition-all duration-200"
            >
              <option value="ALL">All Scripts</option>
              <option value="hiragana">Hiragana Only</option>
              <option value="katakana">Katakana Only</option>
              <option value="mixed">Mixed Scripts</option>
            </select>
          </div>

          {/* 3. Group Filter */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-filter" className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              Group Selection
            </label>
            <select
              id="group-filter"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 outline-none focus:border-brand-accent transition-all duration-200"
            >
              <option value="ALL">All Groups</option>
              <option value="main">Main Only</option>
              <option value="dakuten">Dakuten Only</option>
              <option value="combination">Combination Only</option>
              <option value="mixed">Mixed Groups</option>
            </select>
          </div>

          {/* 4. Configuration Selection Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="config-filter" className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              Specific Selection
            </label>
            <select
              id="config-filter"
              value={activeFilterConfig}
              onChange={(e) => setFilterConfig(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 outline-none focus:border-brand-accent transition-all duration-200 truncate"
            >
              <option value="ALL">All Grouped Sets</option>
              {filteredUniqueConfigs.map((cfg) => (
                <option key={cfg.configKey} value={cfg.configKey}>
                  {cfg.isCustom
                    ? `Custom (${cfg.selectedCount} Chars) - ${cfg.selectedPreview}`
                    : cfg.configName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Header Sort */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 pt-3 gap-3">
          <div className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">
            Showing <span className="text-slate-300">{processedEntries.length}</span> matching runs
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Sort by:</span>
            {[
              { label: "Score", field: "score" },
              { label: "Time", field: "totalTime" },
              { label: "Accuracy", field: "accuracy" },
              { label: "Date", field: "date" }
            ].map((btn) => (
              <button
                key={btn.field}
                type="button"
                onClick={() => handleSort(btn.field)}
                className={clsx(
                  "px-3 py-1 rounded-lg border text-xs font-extrabold transition-all duration-200 cursor-pointer",
                  sortBy === btn.field
                    ? "border-brand-accent bg-brand-accent/5 text-brand-accent"
                    : "border-slate-800 text-slate-400 hover:border-slate-700"
                )}
              >
                {btn.label} {sortBy === btn.field ? (sortOrder === "asc" ? "▲" : "▼") : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Container - Shown on Desktop, Hidden on Mobile */}
      <div className="hidden md:block border border-slate-800 rounded-2xl bg-brand-card/30 overflow-hidden glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                <th className="py-4 px-6">Rank</th>
                <th className="py-4 px-4">Config Mode</th>
                <th className="py-4 px-4 text-center">Grade</th>
                <th className="py-4 px-4 text-right">Score</th>
                <th className="py-4 px-4 text-right">Accuracy</th>
                <th className="py-4 px-4 text-right">Time</th>
                <th className="py-4 px-6 text-right">Date Achieved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-xs">
              {processedEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500 font-semibold text-sm">
                    No matching leaderboard scores found. Set a new record!
                  </td>
                </tr>
              ) : (
                processedEntries.map((entry, idx) => {
                  let rankBadge = "text-slate-400 bg-slate-800/40 border-slate-700";
                  if (idx === 0 && activeFilterConfig !== "ALL") {
                    rankBadge = "text-yellow-400 bg-yellow-500/10 border-yellow-500/30 font-black shadow-[0_0_10px_rgba(234,179,8,0.15)]";
                  } else if (idx === 1 && activeFilterConfig !== "ALL") {
                    rankBadge = "text-slate-300 bg-slate-300/10 border-slate-300/30";
                  } else if (idx === 2 && activeFilterConfig !== "ALL") {
                    rankBadge = "text-amber-600 bg-amber-600/10 border-amber-600/30";
                  }

                  return (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.4) }}
                      className="hover:bg-slate-900/20 transition-all duration-150"
                    >
                      {/* Rank */}
                      <td className="py-4 px-6 font-bold">
                        <span className={clsx(
                          "inline-flex items-center justify-center w-6 h-6 rounded-md border text-[10px]",
                          rankBadge
                        )}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Config Mode */}
                      <td className="py-4 px-4 font-bold text-slate-300">
                        <div className="flex flex-col gap-1.5 py-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-200">
                              {entry.isReview 
                                ? `Custom Mistake Review` 
                                : entry.isCustom 
                                  ? "Custom Set" 
                                  : entry.configName}
                            </span>
                            {entry.isReview ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.1)]">
                                {entry.selectedCount || entry.totalQuestions} Chars
                              </span>
                            ) : entry.isCustom ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-brand-accent/15 border border-brand-accent/30 text-brand-accent shadow-[0_0_8px_rgba(56,189,248,0.1)]">
                                {entry.selectedCount || entry.totalQuestions} Chars
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-800 border border-slate-700 text-slate-400">
                                Preset
                              </span>
                            )}
                          </div>
                          
                          {/* Script & Group tags */}
                          {(entry.isCustom || entry.isReview) && (
                            <div className="flex flex-wrap gap-1 items-center">
                              {entry.scriptList && entry.scriptList.map(s => (
                                <span key={s} className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-slate-900 text-slate-400 border border-slate-800">
                                  {s}
                                </span>
                              ))}
                              {entry.groupList && entry.groupList.map(g => (
                                <span key={g} className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-slate-900/60 border border-slate-900/60 text-slate-500">
                                  {g}
                                </span>
                              ))}
                              {entry.selectedPreview && entry.selectedPreview !== "Legacy Run" && (
                                <div className="text-[10px] text-slate-400 font-medium max-w-[200px] sm:max-w-xs truncate" title={entry.selectedPreview}>
                                  <span className="text-slate-600 font-extrabold uppercase tracking-wider text-[8px] mr-1">Preview:</span>
                                  <span className="font-mono">{entry.selectedPreview}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Grade Badge */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-black text-[10px] bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                          {entry.grade || "A"}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-4 px-4 text-right font-extrabold text-brand-accent">
                        {entry.score}
                      </td>

                      {/* Accuracy */}
                      <td className="py-4 px-4 text-right font-bold text-slate-300">
                        {(entry.accuracy * 100).toFixed(0)}%
                        <span className="text-[10px] text-slate-500 font-medium ml-1">
                          ({entry.correctAnswers}/{entry.totalQuestions})
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-4 px-4 text-right font-mono text-slate-300">
                        {formatTime(entry.totalTime)}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-right text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {formatDate(entry.date)}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards Container - Shown on Mobile, Hidden on Desktop */}
      <div className="block md:hidden space-y-4">
        {processedEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-sm border border-slate-800 rounded-2xl bg-brand-card/30 glass-panel">
            No matching leaderboard scores found. Set a new record!
          </div>
        ) : (
          processedEntries.map((entry, idx) => {
            let rankColor = "text-slate-400 bg-slate-900 border-slate-800";
            if (idx === 0 && activeFilterConfig !== "ALL") {
              rankColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/30 font-black shadow-[0_0_8px_rgba(234,179,8,0.15)]";
            } else if (idx === 1 && activeFilterConfig !== "ALL") {
              rankColor = "text-slate-300 bg-slate-300/10 border-slate-300/30";
            } else if (idx === 2 && activeFilterConfig !== "ALL") {
              rankColor = "text-amber-600 bg-amber-600/10 border-amber-600/30";
            }

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.4) }}
                className="p-5 rounded-2xl border border-slate-800 bg-brand-card/45 glass-panel space-y-3 relative overflow-hidden"
              >
                {/* Header Row: Rank, Badges, Grade */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "inline-flex items-center justify-center w-6 h-6 rounded-md border text-[10px] font-black",
                      rankColor
                    )}>
                      #{idx + 1}
                    </span>
                    
                    {entry.isReview ? (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.1)]">
                        Mistake Review
                      </span>
                    ) : entry.isCustom ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-brand-accent/15 border border-brand-accent/30 text-brand-accent shadow-[0_0_8px_rgba(56,189,248,0.1)]">
                        Custom Set
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-800 border border-slate-700 text-slate-400">
                        Preset
                      </span>
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-900 border border-slate-850 text-slate-350 uppercase shrink-0">
                    Grade {entry.grade || "A"}
                  </span>
                </div>

                {/* Configuration Name and preview details */}
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-200">
                    {entry.isReview 
                      ? `Mistake Review (${entry.selectedCount || entry.totalQuestions} Chars)` 
                      : entry.configName}
                  </div>
                  
                  {/* Metadata tags */}
                  {(entry.isCustom || entry.isReview) && (
                    <div className="flex flex-wrap gap-1 items-center pt-0.5">
                      {entry.scriptList && entry.scriptList.map(s => (
                        <span key={s} className="px-1 py-0.1 rounded text-[7px] font-bold uppercase bg-slate-900 text-slate-450 border border-slate-800">
                          {s}
                        </span>
                      ))}
                      {entry.groupList && entry.groupList.map(g => (
                        <span key={g} className="px-1 py-0.1 rounded text-[7px] font-bold uppercase bg-slate-900 text-slate-500 border border-slate-800">
                          {g}
                        </span>
                      ))}
                      {entry.selectedPreview && entry.selectedPreview !== "Legacy Run" && (
                        <span className="text-[9px] text-slate-500 font-mono truncate max-w-[120px]" title={entry.selectedPreview}>
                          ({entry.selectedPreview})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Grid of Key Metrics */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-slate-900 bg-slate-950/30 text-center font-medium">
                  <div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Score</span>
                    <span className="text-xs font-black text-brand-accent">{entry.score}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Accuracy</span>
                    <span className="text-xs font-bold text-slate-300">
                      {(entry.accuracy * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Time</span>
                    <span className="text-xs font-mono text-slate-300">{formatTime(entry.totalTime)}</span>
                  </div>
                </div>

                {/* Date stamp */}
                <div className="text-[8px] text-slate-600 font-bold uppercase tracking-wider text-right">
                  Achieved: {formatDate(entry.date)}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
