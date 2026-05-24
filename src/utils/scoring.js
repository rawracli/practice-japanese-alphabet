/**
 * Calculates a weighted performance score.
 * Formula: (accuracy * 1000) - (wrongAttempts * 15) - totalTimeSeconds
 */
export function calculateScore(accuracy, wrongAttempts, totalTimeSeconds) {
  const penalty = 15;
  const score = (accuracy * 1000) - (wrongAttempts * penalty) - totalTimeSeconds;
  return Math.max(0, Math.round(score));
}

/**
 * Assigns a letter grade based on accuracy.
 */
export function getGrade(accuracy) {
  const pct = accuracy * 100;
  if (pct === 100) return { letter: "S", color: "text-emerald-400 border-emerald-400/50 bg-emerald-500/10" };
  if (pct >= 90) return { letter: "A", color: "text-cyan-400 border-cyan-400/50 bg-cyan-500/10" };
  if (pct >= 80) return { letter: "B", color: "text-blue-400 border-blue-400/50 bg-blue-500/10" };
  if (pct >= 70) return { letter: "C", color: "text-yellow-400 border-yellow-400/50 bg-yellow-500/10" };
  return { letter: "D", color: "text-rose-400 border-rose-400/50 bg-rose-500/10" };
}

/**
 * Determines if a new run constitutes a "Personal Best" for a configuration.
 * A run is a new best if:
 * 1. There is no previous best.
 * 2. The new score is strictly greater than the previous best score.
 * 3. It meets an 80% accuracy threshold and the completion time is strictly faster.
 */
export function isNewBest(newRun, prevBest) {
  if (!prevBest) return true;

  // Rule 1: strictly better score
  if (newRun.score > prevBest.score) {
    return true;
  }

  // Rule 2: meets threshold (80%) and has a faster time
  if (newRun.accuracy >= 0.80) {
    if (newRun.totalTime < prevBest.totalTime) {
      return true;
    }
  }

  return false;
}
