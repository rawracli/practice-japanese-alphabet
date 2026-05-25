import { kanaData } from "../data/kanaData";

const SRS_KEY = "kana_practice_srs";

/**
 * Loads SRS data from localStorage with full parsing try-catch safeguards.
 */
export function loadSrsData() {
  try {
    const data = localStorage.getItem(SRS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("[SRS] Corrupt SRS file parsed. Resetting to safe default.", e);
    try {
      localStorage.removeItem(SRS_KEY);
    } catch {}
    return {};
  }
}

/**
 * Saves SRS data to localStorage with error protection.
 */
export function saveSrsData(srsData) {
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(srsData));
  } catch (e) {
    console.error("[SRS] Failed to save SRS progress:", e);
  }
}

/**
 * Updates SRS statistics for kana characters practiced in a session.
 */
export function updateSrsData(sessionStats) {
  try {
    const srsData = loadSrsData();
    const now = new Date().toISOString();

    Object.keys(sessionStats).forEach(id => {
      const sessionRecord = sessionStats[id];
      const srsRecord = srsData[id] || {
        id: id,
        totalAttempts: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        currentStreak: 0,
        bestStreak: 0,
        avgResponseTime: 0,
        totalResponseTime: 0,
        difficultyWeight: 1.0,
        lastPracticed: ""
      };

      // Increment attempts
      srsRecord.totalAttempts += 1;
      srsRecord.lastPracticed = now;

      // First time correct is a correct hit without skips or errors
      const isFirstTimeCorrect = sessionRecord.wrongAttempts === 0 && !sessionRecord.skipped;

      if (isFirstTimeCorrect) {
        srsRecord.correctAnswers += 1;
        srsRecord.currentStreak += 1;
        srsRecord.bestStreak = Math.max(srsRecord.bestStreak, srsRecord.currentStreak);
        
        // Decrease difficulty weight on success
        srsRecord.difficultyWeight = Math.max(0.15, srsRecord.difficultyWeight - 0.15);
      } else {
        srsRecord.wrongAnswers += 1;
        srsRecord.currentStreak = 0; // Reset streak

        // Increase difficulty weight based on errors
        const errorPenalty = Math.min(0.25 * Math.max(1, sessionRecord.wrongAttempts), 1.0);
        srsRecord.difficultyWeight = Math.min(5.0, srsRecord.difficultyWeight + errorPenalty);
      }

      // Update response times
      const timeSpent = sessionRecord.timeSpent || 0;
      srsRecord.totalResponseTime = (srsRecord.totalResponseTime || 0) + timeSpent;
      srsRecord.avgResponseTime = srsRecord.totalResponseTime / srsRecord.totalAttempts;

      srsData[id] = srsRecord;
    });

    saveSrsData(srsData);
  } catch (e) {
    console.error("[SRS] Failed to update stats session:", e);
  }
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a smart, coverage-guaranteed session queue:
 * 1. Base Pool: Every selected kana is included EXACTLY ONCE (guaranteeing 100% coverage).
 * 2. Secondary Review Pool: Dynamically adds troubled kana based on past SRS weights.
 * 3. Smart Merging: Intersperses review items ensuring a minimum spacing of 4 cards to prevent back-to-back spam.
 * 4. Prioritization logic: If history contains >= 30 total attempts, we prioritize weak characters over unpracticed.
 */
export function generateWeightedQuizList(selectedKanaPool) {
  if (!selectedKanaPool || selectedKanaPool.length === 0) return [];
  
  // For small selection sizes, just do a clean shuffle to prevent duplicates or spacing failures
  if (selectedKanaPool.length <= 3) {
    return shuffleArray(selectedKanaPool);
  }

  const srsData = loadSrsData();

  // Calculate total practice history attempts
  const totalAttemptsHistory = Object.values(srsData).reduce((sum, r) => sum + (r.totalAttempts || 0), 0);
  const sufficientHistory = totalAttemptsHistory >= 30;

  // 1. Create Base Queue: every selected kana exactly once
  const baseQueue = shuffleArray(selectedKanaPool);

  // 2. Identify weak kana in selected pool to build Review Pool
  const poolWithWeights = selectedKanaPool.map(kana => {
    const record = srsData[kana.id];
    let weight = 1.0;

    if (record) {
      weight = record.difficultyWeight || 1.0;
      
      // Boost weight slightly if errors are high
      if (record.totalAttempts > 0) {
        const errorRate = record.wrongAnswers / record.totalAttempts;
        weight += errorRate * 1.5;
        
        if (record.currentStreak >= 3) {
          weight = Math.max(0.15, weight - 0.25);
        }
      }
    } else {
      // If sufficient history exists, unpracticed characters get normal weight.
      // If history is shallow, unpracticed characters get a boost to introduce them!
      weight = sufficientHistory ? 1.0 : 1.4;
    }

    return {
      kana,
      weight: Math.max(0.15, Math.min(weight, 5.0))
    };
  });

  // Extract troubled characters (weight > 1.5)
  const troubledPool = poolWithWeights.filter(item => item.weight > 1.5);
  troubledPool.sort((a, b) => b.weight - a.weight);

  // Limit review queue size relative to selection pool to prevent runaway queue lengths
  const maxInjectedReviews = Math.max(1, Math.min(8, Math.ceil(selectedKanaPool.length * 0.15)));
  const reviewQueue = troubledPool.slice(0, maxInjectedReviews).map(item => item.kana);

  // 3. Merge base queue and review queue intelligently ensuring spacing of >= 4 slots
  const merged = [...baseQueue];

  reviewQueue.forEach(weakItem => {
    // Find index of first appearance in baseQueue
    const firstIdx = merged.findIndex(k => k.id === weakItem.id);
    if (firstIdx !== -1) {
      const minInsertIdx = firstIdx + 4;
      if (minInsertIdx < merged.length) {
        // Insert at a random index between minInsertIdx and merged.length
        const insertIdx = minInsertIdx + Math.floor(Math.random() * (merged.length - minInsertIdx));
        merged.splice(insertIdx, 0, weakItem);
      } else {
        // Append to the end
        merged.push(weakItem);
      }
    } else {
      merged.push(weakItem);
    }
  });

  return merged;
}

/**
 * Gets aggregated SRS statistics for all kana.
 * Highlights: hardest kana, most missed kana, best mastered kana.
 */
export function getSrsAnalysis() {
  try {
    const srsData = loadSrsData();
    const records = Object.values(srsData).filter(r => r.totalAttempts > 0);

    if (records.length === 0) {
      return {
        hardestKana: [],
        mostMissedKana: [],
        bestMasteredKana: [],
        totalPracticedCount: 0
      };
    }

    // 1. Hardest Kana: sorted by difficultyWeight descending
    const hardest = [...records]
      .sort((a, b) => (b.difficultyWeight || 0) - (a.difficultyWeight || 0))
      .slice(0, 5)
      .map(r => ({ ...r, ...kanaData.find(k => k.id === r.id) }));

    // 2. Most Missed Kana: sorted by wrongAnswers descending
    const mostMissed = [...records]
      .filter(r => r.wrongAnswers > 0)
      .sort((a, b) => b.wrongAnswers - a.wrongAnswers)
      .slice(0, 5)
      .map(r => ({ ...r, ...kanaData.find(k => k.id === r.id) }));

    // 3. Best Mastered
    const bestMastered = [...records]
      .filter(r => r.correctAnswers > 0 && r.wrongAnswers === 0 || (r.correctAnswers / r.totalAttempts) >= 0.85)
      .sort((a, b) => {
        if (a.difficultyWeight !== b.difficultyWeight) {
          return a.difficultyWeight - b.difficultyWeight; // lower weight first
        }
        return b.currentStreak - a.currentStreak; // higher streak first
      })
      .slice(0, 5)
      .map(r => ({ ...r, ...kanaData.find(k => k.id === r.id) }));

    return {
      hardestKana: hardest,
      mostMissedKana: mostMissed,
      bestMasteredKana: bestMastered,
      totalPracticedCount: records.length
    };
  } catch (e) {
    console.error("[SRS] Analysis computation error:", e);
    return {
      hardestKana: [],
      mostMissedKana: [],
      bestMasteredKana: [],
      totalPracticedCount: 0
    };
  }
}
