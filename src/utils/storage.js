import { isNewBest } from "./scoring";
import { kanaData } from "../data/kanaData";

const LEADERBOARD_KEY = "kana_practice_leaderboard";
const PERSONAL_BESTS_KEY = "kana_practice_pbs";
const SELECTIONS_KEY = "kana_practice_selections";

/**
 * Gets a human-readable name for a given quiz configuration or selected IDs.
 */
export function getConfigName(config) {
  if (!config) return "Practice Session";

  let selectedIds = [];

  // Handle case where config is array of IDs
  if (Array.isArray(config)) {
    selectedIds = config;
  } 
  // Handle case where config is an object with selectedIds property
  else if (typeof config === "object" && Array.isArray(config.selectedIds)) {
    selectedIds = config.selectedIds;
  }
  // Handle legacy config object: { scripts: { hiragana, katakana }, groups: { main, dakuten, combination } }
  else if (typeof config === "object" && config.scripts && config.groups) {
    selectedIds = kanaData
      .filter(char => config.scripts[char.script] && config.groups[char.group])
      .map(char => char.id);
  } else {
    return "Custom Practice";
  }

  if (selectedIds.length === 0) return "No Selection";

  const totalCount = selectedIds.length;
  const selectedKana = kanaData.filter(char => selectedIds.includes(char.id));
  const hSelected = selectedKana.filter(char => char.script === "hiragana");
  const kSelected = selectedKana.filter(char => char.script === "katakana");

  const totalHCount = hSelected.length;
  const totalKCount = kSelected.length;

  const mainSelected = selectedKana.filter(char => char.group === "main");
  const dakutenSelected = selectedKana.filter(char => char.group === "dakuten");
  const combinationSelected = selectedKana.filter(char => char.group === "combination");

  const mainCount = mainSelected.length;
  const dakutenCount = dakutenSelected.length;
  const combinationCount = combinationSelected.length;

  const totalHiragana = 104;
  const totalKatakana = 104;

  // 1. Check exact presets
  if (totalCount === 208) return "All Kana";
  
  if (totalHCount === totalHiragana && totalKCount === 0) return "All Hiragana";
  if (totalKCount === totalKatakana && totalHCount === 0) return "All Katakana";

  if (totalHCount === 46 && totalKCount === 0 && mainCount === 46 && dakutenCount === 0 && combinationCount === 0) {
    const isAllMainHiragana = hSelected.every(char => char.group === "main");
    if (isAllMainHiragana) return "Hiragana Main";
  }
  if (totalKCount === 46 && totalHCount === 0 && mainCount === 46 && dakutenCount === 0 && combinationCount === 0) {
    const isAllMainKatakana = kSelected.every(char => char.group === "main");
    if (isAllMainKatakana) return "Katakana Main";
  }

  if (totalHCount === 25 && totalKCount === 0 && dakutenCount === 25 && mainCount === 0 && combinationCount === 0) {
    return "Hiragana Dakuten";
  }
  if (totalKCount === 25 && totalHCount === 0 && dakutenCount === 25 && mainCount === 0 && combinationCount === 0) {
    return "Katakana Dakuten";
  }

  if (totalHCount === 33 && totalKCount === 0 && combinationCount === 33 && mainCount === 0 && dakutenCount === 0) {
    return "Hiragana Combination";
  }
  if (totalKCount === 33 && totalHCount === 0 && combinationCount === 33 && mainCount === 0 && dakutenCount === 0) {
    return "Katakana Combination";
  }

  // 2. Custom classifications
  if (totalKCount === 0) {
    if (mainCount > 0 && dakutenCount === 0 && combinationCount === 0) {
      return `Hiragana Main Custom (${totalCount} Chars)`;
    }
    return `Custom Hiragana (${totalCount} Chars)`;
  }

  if (totalHCount === 0) {
    if (mainCount > 0 && dakutenCount === 0 && combinationCount === 0) {
      return `Katakana Main Custom (${totalCount} Chars)`;
    }
    return `Custom Katakana (${totalCount} Chars)`;
  }

  return `Custom Mixed (${totalCount} Chars)`;
}

/**
 * Gets the full detailed quiz configuration including stable key, name, script, group, etc.
 */
export function getQuizConfig(config) {
  if (!config) {
    return {
      configKey: "practice_session",
      configName: "Practice Session",
      selectedIds: [],
      selectedPreview: "",
      selectedCount: 0,
      scriptList: [],
      groupList: [],
      isCustom: false
    };
  }

  let selectedIds = [];

  // Handle case where config is array of IDs
  if (Array.isArray(config)) {
    selectedIds = config;
  } 
  // Handle case where config is an object with selectedIds property
  else if (typeof config === "object" && Array.isArray(config.selectedIds)) {
    selectedIds = config.selectedIds;
  }
  // Handle legacy config object: { scripts: { hiragana, katakana }, groups: { main, dakuten, combination } }
  else if (typeof config === "object" && config.scripts && config.groups) {
    selectedIds = kanaData
      .filter(char => config.scripts[char.script] && config.groups[char.group])
      .map(char => char.id);
  }

  const name = getConfigName(config);
  const totalCount = selectedIds.length;
  
  if (totalCount === 0) {
    return {
      configKey: "no_selection",
      configName: name,
      selectedIds: [],
      selectedPreview: "No selection",
      selectedCount: 0,
      scriptList: [],
      groupList: [],
      isCustom: true
    };
  }

  const selectedKana = kanaData.filter(char => selectedIds.includes(char.id));
  const scripts = [...new Set(selectedKana.map(char => char.script))];
  const groups = [...new Set(selectedKana.map(char => char.group))];

  // We determine if it's custom based on whether it is a preset.
  const standardPresets = [
    "All Kana",
    "All Hiragana",
    "All Katakana",
    "Hiragana Main",
    "Katakana Main",
    "Hiragana Dakuten",
    "Katakana Dakuten",
    "Hiragana Combination",
    "Katakana Combination"
  ];
  
  const isCustom = !standardPresets.includes(name);

  // Consistently sort selected IDs to form a stable key
  const sortedIds = [...selectedIds].sort();
  
  const configKey = isCustom
    ? `custom_${sortedIds.join("_")}`
    : name.toLowerCase().replace(/\s+/g, "_");

  // Preview is a list of first few kana romajis
  const previewRomajis = selectedKana.map(char => char.romaji);
  const selectedPreview = previewRomajis.slice(0, 15).join(", ") + (previewRomajis.length > 15 ? "..." : "");

  return {
    configKey,
    configName: name,
    selectedIds,
    selectedPreview,
    selectedCount: totalCount,
    scriptList: scripts,
    groupList: groups,
    isCustom
  };
}


/**
 * Saves the selected kana IDs in localStorage.
 */
export function saveSelectedIds(ids) {
  try {
    localStorage.setItem(SELECTIONS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Failed to save selected IDs:", e);
  }
}

/**
 * Loads the selected kana IDs from localStorage.
 */
export function loadSelectedIds() {
  try {
    const data = localStorage.getItem(SELECTIONS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load selected IDs:", e);
    return null;
  }
}

/**
 * Retrieves the full list of saved runs from localStorage.
 */
export function getLeaderboard() {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    const parsed = data ? JSON.parse(data) : [];
    
    // Auto-migrate or backfill missing fields for backward compatibility
    let migrated = false;
    const migratedEntries = parsed.map(run => {
      if (!run.configKey) {
        const configName = run.configName || "Practice Session";
        const isCustom = configName.includes("Custom") || configName.includes("Mixed") || configName.includes("Practice");
        
        // Let's create a stable fallback key
        const fallbackKey = configName.toLowerCase().replace(/\s+/g, "_");
        
        migrated = true;
        return {
          ...run,
          configKey: fallbackKey,
          configName: configName,
          selectedIds: run.selectedIds || [],
          selectedPreview: run.selectedPreview || "Legacy Run",
          selectedCount: run.selectedCount || run.totalQuestions || 0,
          scriptList: run.scriptList || (configName.toLowerCase().includes("hiragana") ? ["hiragana"] : configName.toLowerCase().includes("katakana") ? ["katakana"] : ["hiragana", "katakana"]),
          groupList: run.groupList || [],
          isCustom: isCustom
        };
      }
      return run;
    });

    if (migrated) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(migratedEntries));
    }
    
    return migratedEntries;
  } catch (e) {
    console.error("Failed to parse leaderboard from localStorage:", e);
    return [];
  }
}


/**
 * Retrieves all personal best configurations.
 */
export function getPersonalBests() {
  try {
    const data = localStorage.getItem(PERSONAL_BESTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Failed to parse PBs from localStorage:", e);
    return {};
  }
}

/**
 * Saves a completed practice run.
 * Automatically checks and updates Personal Bests, and updates the leaderboard.
 * Returns an object: { isPB: boolean, pbDetails: object }
 */
export function saveRun(runDetails) {
  const configInfo = getQuizConfig(runDetails.config);
  const timestamp = new Date().toISOString();
  
  const run = {
    id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    configKey: configInfo.configKey,
    configName: runDetails.configName || configInfo.configName,
    selectedIds: configInfo.selectedIds,
    selectedPreview: configInfo.selectedPreview,
    selectedCount: configInfo.selectedCount,
    scriptList: configInfo.scriptList,
    groupList: configInfo.groupList,
    isCustom: configInfo.isCustom,
    
    accuracy: runDetails.accuracy,
    wrongAttempts: runDetails.wrongAttempts,
    totalTime: runDetails.totalTime,
    score: runDetails.score,
    date: timestamp,
    totalQuestions: runDetails.totalQuestions,
    correctAnswers: runDetails.correctAnswers,
    streak: runDetails.streak,
    grade: runDetails.grade,
    bestStreak: runDetails.bestStreak,
    avgTimePerQuestion: runDetails.avgTimePerQuestion,
    missedKana: runDetails.missedKana || []
  };

  // 1. Save to Leaderboard History
  const leaderboard = getLeaderboard();
  leaderboard.push(run);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));

  // 2. Save/Update Personal Best
  const pbs = getPersonalBests();
  const currentPB = pbs[configInfo.configKey];
  let isPB = false;

  if (isNewBest(run, currentPB)) {
    pbs[configInfo.configKey] = {
      score: run.score,
      totalTime: run.totalTime,
      accuracy: run.accuracy,
      date: run.date,
      configKey: configInfo.configKey,
      configName: run.configName
    };
    localStorage.setItem(PERSONAL_BESTS_KEY, JSON.stringify(pbs));
    isPB = true;
  }

  return { isPB, run };
}

/**
 * Calculates aggregated overall statistics.
 */
export function getOverallStats() {
  const leaderboard = getLeaderboard();
  const totalSessions = leaderboard.length;
  
  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      highestAccuracy: 0,
      fastestTime: null,
      highestScore: 0
    };
  }

  let highestAccuracy = 0;
  let highestScore = 0;
  let fastestTime = null;

  leaderboard.forEach(run => {
    if (run.accuracy > highestAccuracy) {
      highestAccuracy = run.accuracy;
    }
    if (run.score > highestScore) {
      highestScore = run.score;
    }
    // Only count as "fastest completion" if accuracy meets 80%
    if (run.accuracy >= 0.80) {
      if (fastestTime === null || run.totalTime < fastestTime) {
        fastestTime = run.totalTime;
      }
    }
  });

  return {
    totalSessions,
    highestAccuracy,
    fastestTime,
    highestScore
  };
}

/**
 * Clears all data from localStorage (useful for testing or resets).
 */
export function clearAllData() {
  localStorage.removeItem(LEADERBOARD_KEY);
  localStorage.removeItem(PERSONAL_BESTS_KEY);
}
