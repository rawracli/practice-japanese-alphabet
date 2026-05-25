import { isNewBest } from "./scoring";
import { kanaData } from "../data/kanaData";

const LEADERBOARD_KEY = "kana_practice_leaderboard";
const PERSONAL_BESTS_KEY = "kana_practice_pbs";
const SELECTIONS_KEY = "kana_practice_selections";
const RECOVERY_KEY = "kana_practice_interrupted_session";
const VERSION_KEY = "kana_practice_version";
export const CURRENT_STORAGE_VERSION = 1;

/**
 * Migration runner: Checks schema version and upgrades legacy structures to Version 1.
 * Safely recovers or backfills missing fields.
 */
export function migrateLocalStorage() {
  try {
    const savedVersionStr = localStorage.getItem(VERSION_KEY);
    const savedVersion = savedVersionStr ? parseInt(savedVersionStr, 10) : 0;

    if (savedVersion < CURRENT_STORAGE_VERSION) {
      console.log(`[Storage] Migrating schema version ${savedVersion} to ${CURRENT_STORAGE_VERSION}...`);

      // 1. Migrate Leaderboard
      const rawLeaderboard = localStorage.getItem(LEADERBOARD_KEY);
      if (rawLeaderboard) {
        try {
          const parsed = JSON.parse(rawLeaderboard);
          if (Array.isArray(parsed)) {
            const migrated = parsed.map(run => ({
              id: run.id || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              configKey: run.configKey || "practice_session",
              configName: run.configName || "Practice Session",
              selectedIds: Array.isArray(run.selectedIds) ? run.selectedIds : [],
              selectedPreview: run.selectedPreview || "Legacy Practice",
              selectedCount: run.selectedCount || run.totalQuestions || 0,
              scriptList: Array.isArray(run.scriptList) ? run.scriptList : [],
              groupList: Array.isArray(run.groupList) ? run.groupList : [],
              isCustom: typeof run.isCustom === "boolean" ? run.isCustom : true,
              isReview: typeof run.isReview === "boolean" ? run.isReview : false,
              accuracy: typeof run.accuracy === "number" ? run.accuracy : 1.0,
              wrongAttempts: typeof run.wrongAttempts === "number" ? run.wrongAttempts : 0,
              totalTime: typeof run.totalTime === "number" ? run.totalTime : 0,
              score: typeof run.score === "number" ? run.score : 0,
              date: run.date || new Date().toISOString(),
              totalQuestions: run.totalQuestions || 0,
              correctAnswers: run.correctAnswers || 0,
              streak: run.streak || 0,
              grade: run.grade || "A",
              bestStreak: run.bestStreak || 0,
              avgTimePerQuestion: run.avgTimePerQuestion || 0,
              missedKana: Array.isArray(run.missedKana) ? run.missedKana : []
            }));
            localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(migrated));
          }
        } catch (err) {
          console.warn("[Storage] Corrupt leaderboard found during migration. Resetting key.", err);
          localStorage.removeItem(LEADERBOARD_KEY);
        }
      }

      // 2. Migrate SRS Data
      const SRS_KEY = "kana_practice_srs";
      const rawSrs = localStorage.getItem(SRS_KEY);
      if (rawSrs) {
        try {
          const srsData = JSON.parse(rawSrs);
          if (srsData && typeof srsData === "object") {
            Object.keys(srsData).forEach(id => {
              const char = srsData[id];
              srsData[id] = {
                id: char.id || id,
                totalAttempts: char.totalAttempts || 0,
                correctAnswers: char.correctAnswers || 0,
                wrongAnswers: char.wrongAnswers || 0,
                currentStreak: char.currentStreak || 0,
                bestStreak: char.bestStreak || 0,
                avgResponseTime: char.avgResponseTime || 0,
                totalResponseTime: char.totalResponseTime || 0,
                difficultyWeight: char.difficultyWeight || 1.0,
                lastPracticed: char.lastPracticed || ""
              };
            });
            localStorage.setItem(SRS_KEY, JSON.stringify(srsData));
          }
        } catch (err) {
          console.warn("[Storage] Corrupt SRS found during migration. Resetting key.", err);
          localStorage.removeItem(SRS_KEY);
        }
      }

      localStorage.setItem(VERSION_KEY, CURRENT_STORAGE_VERSION.toString());
      console.log("[Storage] Migration complete.");
    }
  } catch (e) {
    console.error("[Storage] Failed to run migration:", e);
  }
}

/**
 * Gets a human-readable name for a given quiz configuration or selected IDs.
 */
export function getConfigName(config) {
  if (!config) return "Practice Session";

  // Handle case where config is a mistake review
  if (typeof config === "object" && config.isReview) {
    const totalCount = Array.isArray(config.selectedIds) ? config.selectedIds.length : 0;
    return `Custom Mistake Review (${totalCount} Kana)`;
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
  // Handle legacy config object
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
      isCustom: false,
      isReview: false
    };
  }

  let selectedIds = [];
  let isReview = false;

  // Handle case where config is array of IDs
  if (Array.isArray(config)) {
    selectedIds = config;
  } 
  // Handle case where config is an object with selectedIds property
  else if (typeof config === "object" && Array.isArray(config.selectedIds)) {
    selectedIds = config.selectedIds;
    isReview = !!config.isReview;
  }
  // Handle legacy config object
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
      isCustom: true,
      isReview: isReview
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
  
  const isCustom = isReview || !standardPresets.includes(name);

  // Normalize, sort alphabetically, and stabilize custom configKey generation
  const sortedIds = Array.isArray(selectedIds)
    ? [...selectedIds].map(id => id.trim().toLowerCase()).sort()
    : [];
  
  let configKey;
  if (isReview) {
    configKey = `review_${sortedIds.join("_")}`;
  } else {
    configKey = isCustom
      ? `custom_${sortedIds.join("_")}`
      : name.toLowerCase().replace(/\s+/g, "_");
  }

  // Preview is a list of first few kana romajis
  const previewRomajis = selectedKana.map(char => char.romaji);
  const selectedPreview = previewRomajis.slice(0, 15).join(", ") + (previewRomajis.length > 15 ? "..." : "");

  return {
    configKey,
    configName: name,
    selectedIds: sortedIds,
    selectedPreview,
    selectedCount: totalCount,
    scriptList: scripts,
    groupList: groups,
    isCustom,
    isReview
  };
}

/**
 * Saves the selected kana IDs in localStorage with error protection.
 */
export function saveSelectedIds(ids) {
  try {
    localStorage.setItem(SELECTIONS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("[Storage] Failed to save selected IDs:", e);
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
    console.error("[Storage] Corrupt selections found. Loading default.", e);
    localStorage.removeItem(SELECTIONS_KEY);
    return null;
  }
}

/**
 * Retrieves the full list of saved runs from localStorage with syntax safety.
 */
export function getLeaderboard() {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("[Storage] Corrupt leaderboard found. Wiping to safe empty state.", e);
    localStorage.removeItem(LEADERBOARD_KEY);
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
    console.error("[Storage] Corrupt PBs found. Wiping.", e);
    localStorage.removeItem(PERSONAL_BESTS_KEY);
    return {};
  }
}

/**
 * History Pruner: Cops leaderboard at 400 entries while strictly protecting PBs.
 */
function trimHistory(leaderboard) {
  const maxEntries = 400;
  if (leaderboard.length <= maxEntries) return leaderboard;

  // Track the highest score run for each unique configKey to prevent deleting PBs
  const bestRuns = {};
  leaderboard.forEach(run => {
    const key = run.configKey;
    if (!bestRuns[key] || run.score > bestRuns[key].score) {
      bestRuns[key] = run;
    }
  });

  const pbIds = new Set(Object.values(bestRuns).map(run => run.id));

  // Split and trim only older non-PB entries
  const pbs = leaderboard.filter(run => pbIds.has(run.id));
  const nonPbs = leaderboard.filter(run => !pbIds.has(run.id));

  nonPbs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Cap non-PBs keeping a minimum count buffer
  const allowedNonPbsCount = Math.max(100, maxEntries - pbs.length);
  const trimmedNonPbs = nonPbs.slice(0, allowedNonPbsCount);

  return [...pbs, ...trimmedNonPbs];
}

/**
 * Saves a completed practice run.
 * Automatically checks and updates Personal Bests, and updates the leaderboard.
 * Caps history size to prevent localStorage exhaustion.
 */
export function saveRun(runDetails) {
  try {
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
      isReview: configInfo.isReview || false,
      
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
    let leaderboard = getLeaderboard();
    leaderboard.push(run);

    // Apply LocalStorage Size Protection Trimming
    leaderboard = trimHistory(leaderboard);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));

    // 2. Save/Update Personal Best
    const pbs = getPersonalBests();
    const currentPB = pbs[configInfo.configKey];
    let isPB = false;

    if (isNewBest(run, currentPB)) {
      pbs[configInfo.configKey] = {
        id: run.id,
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
  } catch (e) {
    console.error("[Storage] Failed to save run log:", e);
    return { isPB: false, run: null };
  }
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
 * Recovery Hydration: Save active interrupted session.
 */
export function saveRecoverySession(sessionData) {
  try {
    const recoveryPayload = {
      version: CURRENT_STORAGE_VERSION,
      timestamp: Date.now(),
      data: sessionData
    };
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryPayload));
  } catch (e) {
    console.error("[Storage] Failed to save recovery session:", e);
  }
}

/**
 * Recovery Hydration: Load active session, verifying schema version integrity.
 */
export function loadRecoverySession() {
  try {
    const data = localStorage.getItem(RECOVERY_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);
    // Schema version validation to prevent crashes from outdated structures
    if (parsed && parsed.version === CURRENT_STORAGE_VERSION) {
      return parsed.data;
    } else {
      console.warn("[Storage] Discarding recovery payload due to version mismatch.");
      clearRecoverySession();
      return null;
    }
  } catch (e) {
    console.error("[Storage] Recovery load error. Discarding.", e);
    clearRecoverySession();
    return null;
  }
}

/**
 * Recovery Hydration: Delete active recovery log.
 */
export function clearRecoverySession() {
  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch (e) {
    console.error("[Storage] Failed to clear recovery session:", e);
  }
}

// -------------------------------------------------------------
// Visual Settings Resets Panel Handlers
// -------------------------------------------------------------

export function clearSrsData() {
  try {
    localStorage.removeItem("kana_practice_srs");
    console.log("[Storage] SRS progress cleared successfully.");
  } catch (e) {
    console.error("[Storage] Failed to clear SRS data:", e);
  }
}

export function clearLeaderboard() {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
    console.log("[Storage] Historical Leaderboard cleared.");
  } catch (e) {
    console.error("[Storage] Failed to clear leaderboard:", e);
  }
}

export function clearAnalytics() {
  try {
    localStorage.removeItem(PERSONAL_BESTS_KEY);
    console.log("[Storage] Aggregated PBs and analytics reset.");
  } catch (e) {
    console.error("[Storage] Failed to clear analytics:", e);
  }
}

export function clearTheme() {
  try {
    localStorage.setItem("kana_practice_theme", "theme-dark");
    document.documentElement.className = "theme-dark";
    console.log("[Storage] Theme preference reset to theme-dark.");
  } catch (e) {
    console.error("[Storage] Failed to clear theme preferences:", e);
  }
}

export function clearAllData() {
  try {
    clearLeaderboard();
    clearAnalytics();
    clearSrsData();
    clearTheme();
    clearRecoverySession();
  } catch (e) {
    console.error("[Storage] Full data reset error:", e);
  }
}
