import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import clsx from "clsx";
import { kanaData } from "../data/kanaData";
import FontDropdown from "./FontDropdown";
import { getFontClassName } from "../utils/fonts";

// Helper to group characters into their traditional families/rows
function groupKanaIntoRows(chars, group) {
  if (!chars || chars.length === 0) return [];

  const rows = [];
  
  if (group === "main") {
    // Splits the 46 main kana into traditional rows:
    // A-row: 5, K-row: 5, S-row: 5, T-row: 5, N-row: 5, H-row: 5, M-row: 5, Y-row: 3, R-row: 5, W-row: 3
    const rowDefinitions = [
      { name: "A-Row", count: 5 },
      { name: "K-Row", count: 5 },
      { name: "S-Row", count: 5 },
      { name: "T-Row", count: 5 },
      { name: "N-Row", count: 5 },
      { name: "H-Row", count: 5 },
      { name: "M-Row", count: 5 },
      { name: "Y-Row", count: 3 },
      { name: "R-Row", count: 5 },
      { name: "W-Row", count: 3 }
    ];

    let currentIndex = 0;
    rowDefinitions.forEach((def) => {
      const rowChars = chars.slice(currentIndex, currentIndex + def.count);
      if (rowChars.length > 0) {
        rows.push({ name: def.name, chars: rowChars });
      }
      currentIndex += def.count;
    });
  } else if (group === "dakuten") {
    // Splits the 25 dakuten kana into 5 rows of 5:
    // G-row, Z-row, D-row, B-row, P-row
    const rowNames = ["G-Row", "Z-Row", "D-Row", "B-Row", "P-Row"];
    for (let i = 0; i < 5; i++) {
      const rowChars = chars.slice(i * 5, (i + 1) * 5);
      if (rowChars.length > 0) {
        rows.push({ name: rowNames[i], chars: rowChars });
      }
    }
  } else if (group === "combination") {
    // Splits the 33 combination kana into 11 rows of 3:
    const rowNames = [
      "KY-Row", "SH-Row", "CH-Row", "NY-Row",
      "HY-Row", "MY-Row", "RY-Row", "GY-Row",
      "J-Row", "BY-Row", "PY-Row"
    ];
    for (let i = 0; i < 11; i++) {
      const rowChars = chars.slice(i * 3, (i + 1) * 3);
      if (rowChars.length > 0) {
        rows.push({ name: rowNames[i], chars: rowChars });
      }
    }
  } else {
    // Fallback: group into chunks of 5
    for (let i = 0; i < chars.length; i += 5) {
      rows.push({
        name: `Row ${Math.floor(i / 5) + 1}`,
        chars: chars.slice(i, i + 5)
      });
    }
  }

  return rows;
}

export default function CategorySelector({ config, onChange, totalSelected, selectedFont, setSelectedFont }) {
  // Tabs: 'hiragana' | 'katakana'
  const [activeTab, setActiveTab] = useState("hiragana");
  
  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = useState({
    hiragana_main: true,
    hiragana_dakuten: false,
    hiragana_combination: false,
    katakana_main: true,
    katakana_dakuten: false,
    katakana_combination: false,
  });

  // -------------------------------------------------------------
  // Drag Selection Refs & Global Listeners
  // -------------------------------------------------------------
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef("select"); // 'select' | 'deselect'
  const draggedIdsRef = useRef(new Set());

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      draggedIdsRef.current.clear();
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, []);

  const handleMouseDown = (e, charId) => {
    if (e.button !== 0) return; // Only trigger for left click
    e.preventDefault(); // Prevent text highlight during dragging

    isDraggingRef.current = true;
    const isSelected = config.includes(charId);
    dragModeRef.current = isSelected ? "deselect" : "select";
    
    draggedIdsRef.current.clear();
    draggedIdsRef.current.add(charId);
    
    handleToggleChar(charId);
  };

  const handleMouseEnter = (charId) => {
    if (!isDraggingRef.current) return;
    if (draggedIdsRef.current.has(charId)) return;

    draggedIdsRef.current.add(charId);
    const isAlreadySelected = config.includes(charId);

    if (dragModeRef.current === "select" && !isAlreadySelected) {
      onChange([...config, charId]);
    } else if (dragModeRef.current === "deselect" && isAlreadySelected) {
      onChange(config.filter((id) => id !== charId));
    }
  };

  const handleTouchStart = (e, charId) => {
    isDraggingRef.current = true;
    const isSelected = config.includes(charId);
    dragModeRef.current = isSelected ? "deselect" : "select";

    draggedIdsRef.current.clear();
    draggedIdsRef.current.add(charId);

    handleToggleChar(charId);
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const cardElement = element.closest("[data-kana-id]");
    if (!cardElement) return;

    const charId = cardElement.getAttribute("data-kana-id");
    if (!charId) return;

    if (draggedIdsRef.current.has(charId)) return;
    draggedIdsRef.current.add(charId);

    const isAlreadySelected = config.includes(charId);

    if (dragModeRef.current === "select" && !isAlreadySelected) {
      onChange([...config, charId]);
    } else if (dragModeRef.current === "deselect" && isAlreadySelected) {
      onChange(config.filter((id) => id !== charId));
    }
  };

  // Helper to compute check state of a specific consonant family row
  const getRowState = (rowChars) => {
    const selectedInRow = rowChars.filter((c) => config.includes(c.id));
    if (selectedInRow.length === 0) return "none";
    if (selectedInRow.length === rowChars.length) return "all";
    return "partial";
  };

  // Toggle all elements in a family row
  const handleToggleRow = (rowChars) => {
    const rowIds = rowChars.map((c) => c.id);
    const state = getRowState(rowChars);

    if (state === "all") {
      onChange(config.filter((id) => !rowIds.includes(id)));
    } else {
      const otherIds = config.filter((id) => !rowIds.includes(id));
      onChange([...otherIds, ...rowIds]);
    }
  };

  // Visual checkbox states for family row quick-select buttons
  const renderRowCheckState = (rowChars) => {
    const state = getRowState(rowChars);
    const selectedCount = rowChars.filter((c) => config.includes(c.id)).length;

    if (state === "all") {
      return (
        <span className="w-4 h-4 rounded bg-brand-accent text-slate-950 flex items-center justify-center shadow-[0_0_8px_rgba(56,189,248,0.5)] scale-105 transition-all">
          <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    }
    if (state === "partial") {
      return (
        <span className="w-4 h-4 rounded border border-brand-accent/60 bg-brand-accent/15 flex items-center justify-center text-[9px] font-black text-brand-accent font-mono transition-all">
          {selectedCount}
        </span>
      );
    }
    return (
      <span className="w-4 h-4 rounded border border-slate-700 bg-slate-950/60 hover:border-slate-500 transition-all" />
    );
  };

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Group characters from static data
  const hiraganaMain = useMemo(() => kanaData.filter(c => c.script === "hiragana" && c.group === "main"), []);
  const hiraganaDakuten = useMemo(() => kanaData.filter(c => c.script === "hiragana" && c.group === "dakuten"), []);
  const hiraganaCombination = useMemo(() => kanaData.filter(c => c.script === "hiragana" && c.group === "combination"), []);

  const katakanaMain = useMemo(() => kanaData.filter(c => c.script === "katakana" && c.group === "main"), []);
  const katakanaDakuten = useMemo(() => kanaData.filter(c => c.script === "katakana" && c.group === "dakuten"), []);
  const katakanaCombination = useMemo(() => kanaData.filter(c => c.script === "katakana" && c.group === "combination"), []);

  // Helper to compute state of a group
  const getGroupState = (chars) => {
    const selectedInGroup = chars.filter(c => config.includes(c.id));
    if (selectedInGroup.length === 0) return "none";
    if (selectedInGroup.length === chars.length) return "all";
    return "partial";
  };

  // Helper to toggle a group
  const handleToggleGroup = (chars, currentState) => {
    const charIds = chars.map(c => c.id);
    if (currentState === "all") {
      // Remove all characters in group
      onChange(config.filter(id => !charIds.includes(id)));
    } else {
      // Add all characters in group
      const otherIds = config.filter(id => !charIds.includes(id));
      onChange([...otherIds, ...charIds]);
    }
  };

  // Helper to select all characters in a script
  const handleSelectAllScript = (script) => {
    const scriptIds = kanaData.filter(c => c.script === script).map(c => c.id);
    const otherIds = config.filter(id => !scriptIds.includes(id));
    onChange([...otherIds, ...scriptIds]);
  };

  // Helper to clear all characters in a script
  const handleClearAllScript = (script) => {
    const scriptIds = kanaData.filter(c => c.script === script).map(c => c.id);
    onChange(config.filter(id => !scriptIds.includes(id)));
  };

  // Toggle single character
  const handleToggleChar = (charId) => {
    if (config.includes(charId)) {
      onChange(config.filter(id => id !== charId));
    } else {
      onChange([...config, charId]);
    }
  };

  // Preset definitions mapped to character IDs
  const presets = useMemo(() => {
    return [
      {
        name: "Hiragana Main",
        desc: "Practice the 46 basic Hiragana characters.",
        ids: kanaData.filter(c => c.script === "hiragana" && c.group === "main").map(c => c.id)
      },
      {
        name: "All Hiragana",
        desc: "Master all basic, voiced, and combined Hiragana (104).",
        ids: kanaData.filter(c => c.script === "hiragana").map(c => c.id)
      },
      {
        name: "Katakana Main",
        desc: "Practice the 46 basic Katakana characters.",
        ids: kanaData.filter(c => c.script === "katakana" && c.group === "main").map(c => c.id)
      },
      {
        name: "All Katakana",
        desc: "Master all basic, voiced, and combined Katakana (104).",
        ids: kanaData.filter(c => c.script === "katakana").map(c => c.id)
      },
      {
        name: "All Kana Challenge",
        desc: "The ultimate training: both scripts, all groups (208).",
        ids: kanaData.map(c => c.id)
      }
    ];
  }, []);

  const isPresetActive = useCallback((presetIds) => {
    if (presetIds.length !== config.length) return false;
    const configSet = new Set(config);
    return presetIds.every(id => configSet.has(id));
  }, [config]);

  const handleApplyPreset = (presetIds) => {
    onChange(presetIds);
  };

  // Derived stats for the summary block
  const selectedHiraganaCount = config.filter(id => id.startsWith("h_")).length;
  const selectedKatakanaCount = config.filter(id => id.startsWith("k_")).length;

  const mainSelectedCount = config.filter(id => id.includes("_main_")).length;
  const dakutenSelectedCount = config.filter(id => id.includes("_dakuten_")).length;
  const combinationSelectedCount = config.filter(id => id.includes("_combination_")).length;

  // Active presets/custom evaluation
  const activePresetName = useMemo(() => {
    const activePreset = presets.find(p => isPresetActive(p.ids));
    return activePreset ? activePreset.name : "Custom Configuration";
  }, [presets, isPresetActive]);

  // List of selected kana characters
  const activeKanaObjects = useMemo(() => {
    return kanaData.filter(c => config.includes(c.id));
  }, [config]);

  // Renders the indeterminate/checked checkbox
  const renderCheckbox = (state) => {
    if (state === "all") {
      return (
        <div className="w-5 h-5 rounded-md bg-brand-accent text-slate-950 flex items-center justify-center shadow-[0_0_8px_rgba(56,189,248,0.4)]">
          <svg className="w-3.5 h-3.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (state === "partial") {
      return (
        <div className="w-5 h-5 rounded-md border border-brand-accent/70 bg-brand-accent/10 text-brand-accent flex items-center justify-center">
          <div className="w-2.5 h-0.5 bg-brand-accent rounded" />
        </div>
      );
    }
    return (
      <div className="w-5 h-5 rounded-md border border-slate-700 bg-slate-900/60 hover:border-slate-500 transition-colors" />
    );
  };

  // Renders groups accordion list
  const renderGroupPanel = (groupKey, title, chars, desc) => {
    const state = getGroupState(chars);
    const isExpanded = expandedGroups[groupKey];
    const selectedCount = chars.filter(c => config.includes(c.id)).length;
    const totalCount = chars.length;

    return (
      <div className="border border-slate-800 rounded-2xl bg-brand-card/25 overflow-hidden transition-all duration-300">
        {/* Panel Header */}
        <div className="p-4 flex items-center justify-between gap-3 bg-brand-card/40 hover:bg-brand-card/65 transition-colors cursor-pointer select-none" onClick={() => toggleGroupExpand(groupKey)}>
          <div className="flex items-center gap-3">
            {/* Checkbox wrapper */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleGroup(chars, state);
              }}
              className="cursor-pointer focus:outline-none"
            >
              {renderCheckbox(state)}
            </button>
            <div className="text-left">
              <h4 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                {title}
                <span
                  className={clsx(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold",
                    state === "all" && "bg-brand-accent/15 text-brand-accent",
                    state === "partial" && "bg-cyan-500/10 text-cyan-400",
                    state === "none" && "bg-slate-800 text-slate-500"
                  )}
                >
                  {selectedCount} / {totalCount} Chosen
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">{desc}</p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <svg
              className={clsx(
                "w-4 h-4 transform transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Panel Content (Individual Grid) */}
        {isExpanded && (
          <div 
            className="p-5 border-t border-slate-900 bg-slate-950/20 space-y-4 select-none touch-none"
            onTouchMove={handleTouchMove}
          >
            {/* Group quick controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-900/60 pb-3">
              <div className="flex items-center gap-3">
                <span>Quick Select:</span>
                <button
                  type="button"
                  onClick={() => handleToggleGroup(chars, "none")}
                  className="text-brand-accent hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => handleToggleGroup(chars, "all")}
                  className="text-rose-400 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
              <div className="text-[9px] text-slate-500 font-bold lowercase tracking-normal normal-case">
                💡 Drag mouse or slide finger to paint-select.
              </div>
            </div>

            {/* Consonant Family Rows stack */}
            <div className="space-y-3.5">
              {groupKanaIntoRows(chars, chars[0]?.group || "main").map((row) => (
                <div 
                  key={row.name} 
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-2 rounded-2xl border border-slate-900/40 bg-brand-card/10 hover:border-slate-800/40 transition-colors"
                >
                  {/* Row Selector Pill */}
                  <button
                    type="button"
                    onClick={() => handleToggleRow(row.chars)}
                    className="flex items-center justify-between sm:justify-start gap-2.5 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-900 hover:border-slate-850 hover:bg-slate-900/40 text-left text-xs font-black uppercase tracking-wide text-slate-300 hover:text-slate-100 transition-all select-none cursor-pointer sm:w-28 shrink-0 active:scale-95 focus:outline-none focus:border-brand-accent"
                    title={`Select/Deselect entire ${row.name}`}
                  >
                    <span className="truncate">{row.name}</span>
                    {renderRowCheckState(row.chars)}
                  </button>

                  {/* Character cards grid in this row */}
                  <div className="grid grid-cols-5 gap-2 flex-1">
                    {row.chars.map((char) => {
                      const isSelected = config.includes(char.id);
                      return (
                        <button
                          key={char.id}
                          type="button"
                          data-kana-id={char.id}
                          onMouseDown={(e) => handleMouseDown(e, char.id)}
                          onMouseEnter={() => handleMouseEnter(char.id)}
                          onTouchStart={(e) => handleTouchStart(e, char.id)}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              handleToggleChar(char.id);
                            }
                          }}
                          className={clsx(
                            "relative py-3.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 select-none cursor-pointer transition-all duration-300 transform active:scale-95 focus:outline-none focus:border-brand-accent",
                            isSelected
                              ? "border-brand-accent bg-brand-accent/5 text-slate-100 shadow-[0_0_12px_rgba(56,189,248,0.15)] scale-[1.03]"
                              : "border-slate-900 hover:border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900/20"
                          )}
                        >
                          <span
                            className={clsx(
                              "text-xl md:text-2xl font-black transition-all duration-300",
                              isSelected ? "text-brand-accent drop-shadow-[0_0_4px_rgba(56,189,248,0.4)]" : "text-slate-300",
                              getFontClassName(selectedFont)
                            )}
                          >
                            {char.kana}
                          </span>
                          <span className="text-[9px] font-bold tracking-wide uppercase text-slate-500 pointer-events-none select-none">
                            {char.romaji}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Quick Presets Grid */}
      <div>
        <h3 className="text-xs font-extrabold tracking-widest text-slate-500 uppercase mb-4 text-center sm:text-left">
          Quick-Start Training Presets
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {presets.map((preset) => {
            const isActive = isPresetActive(preset.ids);
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset.ids)}
                className={clsx(
                  "text-left p-4 rounded-2xl border glass-panel transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer",
                  isActive
                    ? "border-brand-accent glow-cyan bg-brand-card-light scale-[1.02] shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                    : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                )}
              >
                <div className={clsx("font-black text-sm", isActive ? "text-brand-accent" : "text-slate-200")}>
                  {preset.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-semibold">
                  {preset.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Hierarchical selection segment */}
      <div className="p-6 md:p-8 rounded-3xl border border-slate-800 bg-brand-card/20 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <h3 className="font-black text-slate-200 text-lg flex items-center gap-2 justify-center md:justify-start">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shadow-[0_0_8px_#38bdf8]"></span>
              Custom Selector
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Toggle groups or configure individual letters below.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Font Selector */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-start">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase hidden lg:inline">Typeface:</span>
              <FontDropdown selectedFont={selectedFont} onFontChange={setSelectedFont} />
            </div>

            {/* Script level Tabs selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800/80 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("hiragana")}
                type="button"
                className={clsx(
                  "flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                  activeTab === "hiragana"
                    ? "bg-brand-accent text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span>あ</span>
                Hiragana
                <span
                  className={clsx(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                    activeTab === "hiragana" ? "bg-slate-950 text-brand-accent" : "bg-slate-900 text-slate-400"
                  )}
                >
                  {selectedHiraganaCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("katakana")}
                type="button"
                className={clsx(
                  "flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                  activeTab === "katakana"
                    ? "bg-brand-accent text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span>ア</span>
                Katakana
                <span
                  className={clsx(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                    activeTab === "katakana" ? "bg-slate-950 text-brand-accent" : "bg-slate-900 text-slate-400"
                  )}
                >
                  {selectedKatakanaCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Global actions toolbar inside tab */}
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <div className="text-slate-400">
            Configure {activeTab === "hiragana" ? "Hiragana (平仮名)" : "Katakana (片仮名)"}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSelectAllScript(activeTab)}
              className="text-brand-accent hover:underline cursor-pointer"
            >
              Select All {activeTab === "hiragana" ? "Hiragana" : "Katakana"}
            </button>
            <span className="text-slate-800">|</span>
            <button
              type="button"
              onClick={() => handleClearAllScript(activeTab)}
              className="text-rose-400 hover:underline cursor-pointer"
            >
              Clear All {activeTab === "hiragana" ? "Hiragana" : "Katakana"}
            </button>
          </div>
        </div>

        {/* Accordions panels stack based on active script tab */}
        <div className="space-y-4">
          {activeTab === "hiragana" ? (
            <>
              {renderGroupPanel(
                "hiragana_main",
                "Hiragana Main Kana (基本)",
                hiraganaMain,
                "The 46 foundational cursive soft characters (a, ka, sa, ta...)"
              )}
              {renderGroupPanel(
                "hiragana_dakuten",
                "Hiragana Dakuten Kana (濁音 / 半濁音)",
                hiraganaDakuten,
                "Voiced and semi-voiced soft letters with diacritic marks (ga, za, da, ba, pa...)"
              )}
              {renderGroupPanel(
                "hiragana_combination",
                "Hiragana Combination Kana (拗音)",
                hiraganaCombination,
                "Soft combined sounds using small ya, yu, yo letters (kya, sha, cha, nya...)"
              )}
            </>
          ) : (
            <>
              {renderGroupPanel(
                "katakana_main",
                "Katakana Main Kana (基本)",
                katakanaMain,
                "The 46 angular block-like standard symbols (a, ka, sa, ta...)"
              )}
              {renderGroupPanel(
                "katakana_dakuten",
                "Katakana Dakuten Kana (濁音 / 半濁音)",
                katakanaDakuten,
                "Voiced and semi-voiced angular letters with diacritic marks (ga, za, da, ba, pa...)"
              )}
              {renderGroupPanel(
                "katakana_combination",
                "Katakana Combination Kana (拗音)",
                katakanaCombination,
                "Angular combined sounds using small ya, yu, yo letters (kya, sha, cha, nya...)"
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. Live Summary Segment Block */}
      <div className="p-6 rounded-3xl border border-slate-800/80 bg-slate-950/40 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="text-center sm:text-left">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase block">Selection Status</span>
            <h4 className="text-lg font-black text-slate-200">{activePresetName}</h4>
          </div>
          <div className="text-center sm:text-right">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase block">Practicing Characters</span>
            <span className="text-2xl font-black text-brand-accent font-mono">{totalSelected} / 208</span>
          </div>
        </div>

        {/* Breakdown chips grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 space-y-0.5 text-center">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Hiragana Chosen</span>
            <span className="text-lg font-black text-slate-200">{selectedHiraganaCount} / 104</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 space-y-0.5 text-center">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Katakana Chosen</span>
            <span className="text-lg font-black text-slate-200">{selectedKatakanaCount} / 104</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 space-y-0.5 text-center">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Main Branch</span>
            <span className="text-lg font-black text-slate-200">{mainSelectedCount} / 92</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 space-y-0.5 text-center">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Special Branches</span>
            <span className="text-lg font-black text-slate-200">{dakutenSelectedCount + combinationSelectedCount} / 116</span>
          </div>
        </div>

        {/* Warnings or guidance alerts */}
        {totalSelected === 0 ? (
          <div className="p-4 rounded-xl border border-rose-500/15 bg-rose-500/5 text-rose-400 text-xs font-semibold text-center animate-pulse">
            ⚠️ No characters selected! Please select at least 1 Hiragana or Katakana character above to start the quiz.
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] text-slate-400 text-[11px] font-semibold leading-relaxed">
            💡 **Practice Scope Active**: The quiz pool is completely limited to your {totalSelected} selected characters. Romaji keyboards will only generate random items from this active set.
          </div>
        )}

        {/* Selected characters list overview (when custom and small pool size) */}
        {config.length > 0 && config.length <= 30 && (
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Active Practice Set characters:</span>
            <div className="flex flex-wrap gap-1.5">
              {activeKanaObjects.map((char) => (
                <span
                  key={char.id}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-bold text-brand-accent flex items-center gap-1"
                >
                  <span className="text-slate-300 font-normal">{char.kana}</span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">({char.romaji})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
