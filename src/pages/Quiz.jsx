import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import QuizHeader from "../components/QuizHeader";
import ProgressBar from "../components/ProgressBar";
import KanaCard from "../components/KanaCard";
import QuizInput from "../components/QuizInput";
import ResultModal from "../components/ResultModal";
import { shuffleArray } from "../utils/shuffle";
import { calculateScore, getGrade } from "../utils/scoring";
import { saveRun, getQuizConfig } from "../utils/storage";
import { playCorrectSound, playWrongSound, playFinishSound, isMuted, setMuted } from "../utils/audio";

export default function Quiz({ selectedKana, config, selectedFont, setSelectedFont }) {
  const navigate = useNavigate();

  // 1. Session state
  const [kanaList, setKanaList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [inputStatus, setInputStatus] = useState("typing"); // 'typing' | 'correct' | 'wrong'
  
  // 2. Metrics & statistics
  const [time, setTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  
  // Tracks wrong attempts specifically on the active kana
  const [wrongAttemptsForCurrent, setWrongAttemptsForCurrent] = useState(0);
  
  // List of unique kana objects that were missed
  const [missedKana, setMissedKana] = useState([]);
  
  // Audio state
  const [muted, setMutedState] = useState(isMuted());

  // 3. Quiz workflow states
  const [quizFinished, setQuizFinished] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [finalStats, setFinalStats] = useState(null);
  
  // Is this a repeat-mistakes practice run?
  const [isMistakesOnlyRun, setIsMistakesOnlyRun] = useState(false);

  // References
  const timerRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  // Initialize the quiz set
  const initQuiz = (list, isMistakeRun = false) => {
    // Clear timeouts/intervals
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const shuffled = shuffleArray(list);
    setKanaList(shuffled);
    setCurrentIndex(0);
    setInputValue("");
    setInputStatus("typing");
    setTime(0);
    setStreak(0);
    setBestStreak(0);
    setWrongAttempts(0);
    setWrongAttemptsForCurrent(0);
    if (!isMistakeRun) {
      setMissedKana([]);
    }
    setQuizFinished(false);
    setIsNewRecord(false);
    setFinalStats(null);
    setIsMistakesOnlyRun(isMistakeRun);

    // Start Timer Interval
    timerRef.current = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
  };

  // Start quiz on mount
  useEffect(() => {
    const startSession = async () => {
      initQuiz(selectedKana);
    };
    startSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [selectedKana]);

  // Mute Handler
  const handleToggleMute = () => {
    const nextState = !muted;
    setMutedState(nextState);
    setMuted(nextState);
  };

  const activeKana = kanaList[currentIndex];

  // Answer Matcher logic
  const checkAnswer = (userInput, targetKana) => {
    const cleanInput = userInput.trim().toLowerCase();
    const primary = targetKana.romaji.toLowerCase();
    
    if (cleanInput === primary) return true;
    
    // Check alternatives
    if (targetKana.alternatives) {
      return targetKana.alternatives.some(alt => alt.toLowerCase() === cleanInput);
    }
    
    return false;
  };

  const handleSkip = () => {
    if (inputStatus === "correct" || quizFinished) return;

    // Record skipped kana as missed
    if (!missedKana.some((k) => k.kana === activeKana.kana)) {
      setMissedKana((prev) => [...prev, activeKana]);
    }

    setWrongAttempts((prev) => prev + 1);
    playWrongSound();
    setStreak(0);

    // Proceed immediately
    moveToNext();
  };

  const handleAnswerSubmit = () => {
    if (inputStatus === "correct" || !inputValue.trim() || quizFinished) return;

    const isCorrect = checkAnswer(inputValue, activeKana);

    if (isCorrect) {
      setInputStatus("correct");
      setStreak((prev) => {
        const nextStreak = prev + 1;
        setBestStreak((currentBest) => Math.max(currentBest, nextStreak));
        return nextStreak;
      });
      playCorrectSound();
      moveToNext();
    } else {
      setInputStatus("wrong");
      playWrongSound();
      setStreak(0);
      setWrongAttempts((prev) => prev + 1);
      setWrongAttemptsForCurrent((prev) => prev + 1);

      // Record this character as missed
      if (!missedKana.some((k) => k.kana === activeKana.kana)) {
        setMissedKana((prev) => [...prev, activeKana]);
      }

      // Reset to typing status after visual shake ends
      transitionTimeoutRef.current = setTimeout(() => {
        setInputStatus("typing");
      }, 350);
    }
  };

  const moveToNext = () => {
    setInputValue("");
    setInputStatus("typing");
    setWrongAttemptsForCurrent(0);

    if (currentIndex + 1 < kanaList.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed the active set!
      finishSession(true);
    }
  };

  const finishSession = (completedAll = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    playFinishSound();

    const totalQuestionsCount = kanaList.length;
    const correctAnswersCount = completedAll ? totalQuestionsCount : currentIndex;

    if (correctAnswersCount === 0 && !completedAll) {
      // Nothing practiced, go back
      navigate("/");
      return;
    }

    const uncompletedCount = totalQuestionsCount - correctAnswersCount;
    const finalWrongAttemptsCount = wrongAttempts + uncompletedCount;

    // Merge uncompleted characters into missedKana list
    let finalMissedKana = [...missedKana];
    if (uncompletedCount > 0) {
      const uncompletedKana = kanaList.slice(currentIndex);
      uncompletedKana.forEach((char) => {
        if (!finalMissedKana.some((k) => k.kana === char.kana)) {
          finalMissedKana.push(char);
        }
      });
    }

    const calculatedAccuracy = correctAnswersCount / (correctAnswersCount + finalWrongAttemptsCount);
    const scoreVal = calculateScore(calculatedAccuracy, finalWrongAttemptsCount, time);
    const gradeLetter = getGrade(calculatedAccuracy).letter;

    const statsObj = {
      config,
      configName: isMistakesOnlyRun ? "Mistakes Review" : undefined,
      totalQuestions: totalQuestionsCount,
      correctAnswers: correctAnswersCount,
      wrongAttempts: finalWrongAttemptsCount,
      accuracy: calculatedAccuracy,
      score: scoreVal,
      totalTime: time,
      avgTimePerQuestion: time / Math.max(1, correctAnswersCount),
      streak,
      bestStreak,
      grade: gradeLetter,
      missedKana: finalMissedKana,
      date: new Date().toISOString()
    };

    // Save run unless it is extremely short (e.g. less than 2 questions)
    let pbFlag = false;
    let savedRunObj = null;

    if (correctAnswersCount >= 3) {
      const saveResult = saveRun(statsObj);
      pbFlag = saveResult.isPB;
      savedRunObj = saveResult.run;
    }

    const configInfo = getQuizConfig(config);
    const fallbackStats = {
      ...statsObj,
      configKey: configInfo.configKey,
      configName: statsObj.configName || configInfo.configName,
      selectedIds: configInfo.selectedIds,
      selectedPreview: configInfo.selectedPreview,
      selectedCount: configInfo.selectedCount,
      scriptList: configInfo.scriptList,
      groupList: configInfo.groupList,
      isCustom: configInfo.isCustom
    };

    setFinalStats(savedRunObj || fallbackStats);
    setIsNewRecord(pbFlag);
    setQuizFinished(true);
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (quizFinished) return;

      if (e.key === "Escape") {
        e.preventDefault();
        finishSession(false);
      } else if (e.key === "Control") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleAnswerSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, quizFinished, inputValue, activeKana, wrongAttempts, missedKana, time, inputStatus]);

  // Restart handler
  const handleRestart = () => {
    initQuiz(selectedKana, false);
  };

  // Repeat Mistakes Session
  const handleRepeatMistakes = () => {
    if (missedKana.length === 0) return;
    initQuiz(missedKana, true);
  };

  if (quizFinished && finalStats) {
    return (
      <div className="space-y-6">
        <ResultModal
          stats={finalStats}
          isPB={isNewRecord}
          onRetry={handleRestart}
          onBackToMenu={() => navigate("/")}
          onViewLeaderboard={() => navigate("/leaderboard")}
        />

        {/* Mini CTA for Practice Mistakes Mode */}
        <AnimatePresence>
          {missedKana.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl mx-auto p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="text-center sm:text-left space-y-1">
                <h4 className="font-extrabold text-slate-200">Focused Mistake Review Mode</h4>
                <p className="text-xs text-slate-400">
                  You had struggles with <span className="text-yellow-400 font-bold">{missedKana.length} kana</span>. Redo the quiz practicing only these characters.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRepeatMistakes}
                type="button"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.15)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4 text-slate-950 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.005a1 1 0 01.94 1.056 5.002 5.002 0 008.053 3.839H10a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 011.009-1.328z" clipRule="evenodd" />
                </svg>
                Practice Missed Only
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (kanaList.length === 0 || !activeKana) {
    return (
      <div className="text-center py-20 text-slate-500 font-bold">
        Loading practice session characters...
      </div>
    );
  }

  const completionFraction = currentIndex / kanaList.length;

  return (
    <div className="space-y-6 py-4 max-w-4xl mx-auto">
      {/* Session Header */}
      <QuizHeader
        modeName={isMistakesOnlyRun ? `Mistakes Review` : "Practice Session"}
        currentIndex={currentIndex}
        totalQuestions={kanaList.length}
        time={time}
        streak={streak}
        isMuted={muted}
        onToggleMute={handleToggleMute}
        onFinish={() => finishSession(false)}
        selectedFont={selectedFont}
        setSelectedFont={setSelectedFont}
      />

      {/* Progress Bar */}
      <ProgressBar progress={completionFraction} />

      {/* Main Flashcard Card display */}
      <div className="py-6">
        <AnimatePresence mode="wait">
          <KanaCard
            key={activeKana.id}
            character={activeKana}
            totalWrongForCurrent={wrongAttemptsForCurrent}
            selectedFont={selectedFont}
          />
        </AnimatePresence>
      </div>

      {/* Typing Answer Input Box */}
      <div className="space-y-6">
        <QuizInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleAnswerSubmit}
          status={inputStatus}
          disabled={inputStatus === "correct"}
        />

        {/* Flow button controls */}
        <div className="flex items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => finishSession(false)}
            type="button"
            className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all duration-200 cursor-pointer"
          >
            Finish Quiz
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRestart}
            type="button"
            className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all duration-200 cursor-pointer"
          >
            Restart
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSkip}
            type="button"
            className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-900 text-brand-accent text-xs font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer"
          >
            Skip
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
