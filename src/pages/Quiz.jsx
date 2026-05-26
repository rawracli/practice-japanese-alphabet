import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import QuizHeader from "../components/QuizHeader";
import ProgressBar from "../components/ProgressBar";
import KanaCard from "../components/KanaCard";
import QuizInput from "../components/QuizInput";
import ResultModal from "../components/ResultModal";
import { shuffleArray } from "../utils/shuffle";
import { calculateScore, getGrade } from "../utils/scoring";
import { saveRun, getQuizConfig, saveRecoverySession, clearRecoverySession, loadRecoverySession } from "../utils/storage";
import { playCorrectSound, playWrongSound, playFinishSound, isMuted, setMuted } from "../utils/audio";
import { updateSrsData, generateWeightedQuizList } from "../utils/srs";

export default function Quiz({ selectedKana, config, selectedFont, setSelectedFont }) {
  const navigate = useNavigate();
  const location = useLocation();

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
  
  // 4. Pause system states
  const [isPaused, setIsPaused] = useState(false);

  // 5. SRS Stats gathering
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [sessionKanaStats, setSessionKanaStats] = useState({});
  const [activeConfig, setActiveConfig] = useState(config);

  // 6. Advanced Queue Injection & Keyboard Shortcuts
  const [injectedCount, setInjectedCount] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Accurate Stopwatch references
  const startTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);

  // References
  const timerRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  // Initialize the quiz set
  const initQuiz = (list, isMistakeRun = false) => {
    // Clear timeouts/intervals
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    // Apply SRS Lite weighted random selection for standard quizzes
    // For mistake runs, we practice exactly what was missed (shuffled)
    const shuffled = isMistakeRun ? shuffleArray(list) : generateWeightedQuizList(list);
    
    setKanaList(shuffled);
    setCurrentIndex(0);
    setInputValue("");
    setInputStatus("typing");
    setTime(0);
    setStreak(0);
    setBestStreak(0);
    setWrongAttempts(0);
    setWrongAttemptsForCurrent(0);
    setIsPaused(false);
    setInjectedCount(0);
    
    // Reset SRS session states
    setQuestionStartTime(Date.now());
    setSessionKanaStats({});

    if (!isMistakeRun) {
      setMissedKana([]);
      setActiveConfig(config);
    } else {
      setActiveConfig({
        isReview: true,
        selectedIds: list.map(k => k.id)
      });
    }

    setQuizFinished(false);
    setIsNewRecord(false);
    setFinalStats(null);
    setIsMistakesOnlyRun(isMistakeRun);

    // Accurate stopwatch initialization
    startTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;

    // Start Timer Interval (every 200ms for perfect snap responsiveness)
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const elapsedMs = Date.now() - startTimeRef.current + accumulatedTimeRef.current;
        setTime(Math.floor(elapsedMs / 1000));
      }
    }, 200);
  };

  // Start/hydrate quiz on mount
  useEffect(() => {
    const startSession = async () => {
      // Check if we are resuming an active session from recovery
      if (location.state?.resumeSession) {
        const recovery = loadRecoverySession();
        if (recovery) {
          setKanaList(recovery.kanaList || []);
          setCurrentIndex(recovery.currentIndex || 0);
          setInputValue(recovery.inputValue || "");
          setInputStatus(recovery.inputStatus || "typing");
          setStreak(recovery.streak || 0);
          setBestStreak(recovery.bestStreak || 0);
          setWrongAttempts(recovery.wrongAttempts || 0);
          setWrongAttemptsForCurrent(recovery.wrongAttemptsForCurrent || 0);
          setMissedKana(recovery.missedKana || []);
          setSessionKanaStats(recovery.sessionKanaStats || {});
          setActiveConfig(recovery.activeConfig || config);
          setIsMistakesOnlyRun(recovery.isMistakesOnlyRun || false);
          setInjectedCount(recovery.injectedCount || 0);

          // Restore stopwatch values
          accumulatedTimeRef.current = recovery.accumulatedTime || 0;
          startTimeRef.current = Date.now();
          setTime(Math.floor(accumulatedTimeRef.current / 1000));
          
          setIsPaused(false);
          setQuestionStartTime(Date.now());

          // Start Timer Interval
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            if (startTimeRef.current !== null) {
              const elapsedMs = Date.now() - startTimeRef.current + accumulatedTimeRef.current;
              setTime(Math.floor(elapsedMs / 1000));
            }
          }, 200);

          // Clear state from router context
          navigate("/quiz", { replace: true, state: {} });
          return;
        }
      }

      // Default initialization
      initQuiz(selectedKana);
    };
    
    startSession();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [selectedKana]);

  // Reactive Session Recovery Auto-saving
  useEffect(() => {
    if (quizFinished) {
      clearRecoverySession();
      return;
    }

    if (kanaList.length === 0) return;

    let currentElapsedMs = accumulatedTimeRef.current;
    if (startTimeRef.current !== null && !isPaused) {
      currentElapsedMs += (Date.now() - startTimeRef.current);
    }
    const currentSeconds = Math.floor(currentElapsedMs / 1000);

    const sessionData = {
      kanaList,
      currentIndex,
      inputValue,
      inputStatus,
      streak,
      bestStreak,
      wrongAttempts,
      wrongAttemptsForCurrent,
      missedKana,
      sessionKanaStats,
      activeConfig,
      isMistakesOnlyRun,
      injectedCount,
      accumulatedTime: currentElapsedMs,
      time: currentSeconds
    };
    
    saveRecoverySession(sessionData);
  }, [
    kanaList,
    currentIndex,
    inputValue,
    inputStatus,
    streak,
    bestStreak,
    wrongAttempts,
    wrongAttemptsForCurrent,
    missedKana,
    sessionKanaStats,
    activeConfig,
    isMistakesOnlyRun,
    injectedCount,
    isPaused,
    quizFinished
  ]);

  // BeforeUnload listener to write the final stopwatch tick right before tab close/suspend
  useEffect(() => {
    const saveOnUnload = () => {
      if (quizFinished || kanaList.length === 0) return;
      
      let currentElapsedMs = accumulatedTimeRef.current;
      if (startTimeRef.current !== null && !isPaused) {
        currentElapsedMs += (Date.now() - startTimeRef.current);
      }
      const currentSeconds = Math.floor(currentElapsedMs / 1000);

      const sessionData = {
        kanaList,
        currentIndex,
        inputValue,
        inputStatus,
        streak,
        bestStreak,
        wrongAttempts,
        wrongAttemptsForCurrent,
        missedKana,
        sessionKanaStats,
        activeConfig,
        isMistakesOnlyRun,
        injectedCount,
        accumulatedTime: currentElapsedMs,
        time: currentSeconds
      };
      
      saveRecoverySession(sessionData);
    };

    window.addEventListener("beforeunload", saveOnUnload);
    return () => {
      window.removeEventListener("beforeunload", saveOnUnload);
    };
  }, [
    kanaList,
    currentIndex,
    inputValue,
    inputStatus,
    streak,
    bestStreak,
    wrongAttempts,
    wrongAttemptsForCurrent,
    missedKana,
    sessionKanaStats,
    activeConfig,
    isMistakesOnlyRun,
    injectedCount,
    isPaused,
    quizFinished
  ]);

  // Mute Handler
  const handleToggleMute = () => {
    const nextState = !muted;
    setMutedState(nextState);
    setMuted(nextState);
  };

  // Pause / Resume Toggle
  const handlePauseToggle = () => {
    if (quizFinished) return;
    setIsPaused((prev) => {
      const nextState = !prev;
      if (nextState) {
        // Pausing: stop interval and store elapsed active time
        if (timerRef.current) clearInterval(timerRef.current);
        if (startTimeRef.current !== null) {
          accumulatedTimeRef.current += (Date.now() - startTimeRef.current);
          startTimeRef.current = null;
        }
      } else {
        // Resuming: reset start time to now and restart interval
        startTimeRef.current = Date.now();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (startTimeRef.current !== null) {
            const elapsedMs = Date.now() - startTimeRef.current + accumulatedTimeRef.current;
            setTime(Math.floor(elapsedMs / 1000));
          }
        }, 200);
        // Reset question start time so pause menus don't inflate average response times
        setQuestionStartTime(Date.now());
      }
      return nextState;
    });
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
    if (inputStatus === "correct" || quizFinished || isPaused) return;

    // Log stats for SRS
    const elapsed = (Date.now() - questionStartTime) / 1000;
    setSessionKanaStats(prev => {
      const existing = prev[activeKana.id] || { id: activeKana.id, wrongAttempts: 0, timeSpent: 0, skipped: false };
      return {
        ...prev,
        [activeKana.id]: {
          ...existing,
          skipped: true,
          wrongAttempts: existing.wrongAttempts + 1,
          timeSpent: existing.timeSpent + elapsed
        }
      };
    });

    // Record skipped kana as missed
    if (!missedKana.some((k) => k.kana === activeKana.kana)) {
      setMissedKana((prev) => [...prev, activeKana]);
    }

    setWrongAttempts((prev) => prev + 1);
    playWrongSound();
    setStreak(0);

    // -------------------------------------------------------------
    // Dynamic Clamped Review Queue Injections for skips
    // -------------------------------------------------------------
    const basePoolSize = isMistakesOnlyRun ? missedKana.length : selectedKana.length;
    const injectionCap = Math.max(10, Math.ceil(basePoolSize * 0.5));
    let nextQueue = [...kanaList];

    if (injectedCount < injectionCap) {
      setInjectedCount((c) => c + 1);

      const remainingLength = kanaList.length - (currentIndex + 1);
      let offset = 4 + Math.floor(Math.random() * 5); // random 4-8

      if (remainingLength === 0) {
        offset = 1;
      } else if (remainingLength < offset) {
        offset = Math.max(2, Math.min(offset, remainingLength + 1));
      }

      const insertIndex = currentIndex + offset;
      nextQueue.splice(insertIndex, 0, activeKana);
      setKanaList(nextQueue);
    }

    // Proceed immediately
    setInputValue("");
    setInputStatus("typing");
    setWrongAttemptsForCurrent(0);
    setQuestionStartTime(Date.now()); // Reset question timer for next item

    if (currentIndex + 1 < nextQueue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishSession(true);
    }
  };

  const handleAnswerSubmit = () => {
    if (inputStatus === "correct" || !inputValue.trim() || quizFinished || isPaused) return;

    const isCorrect = checkAnswer(inputValue, activeKana);

    if (isCorrect) {
      setInputStatus("correct");
      
      // Log stats for SRS
      const elapsed = (Date.now() - questionStartTime) / 1000;
      setSessionKanaStats(prev => {
        const existing = prev[activeKana.id] || { id: activeKana.id, wrongAttempts: 0, timeSpent: 0, skipped: false };
        return {
          ...prev,
          [activeKana.id]: {
            ...existing,
            timeSpent: existing.timeSpent + elapsed
          }
        };
      });

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

      // Log wrong attempts for SRS
      setSessionKanaStats(prev => {
        const existing = prev[activeKana.id] || { id: activeKana.id, wrongAttempts: 0, timeSpent: 0, skipped: false };
        return {
          ...prev,
          [activeKana.id]: {
            ...existing,
            wrongAttempts: existing.wrongAttempts + 1
          }
        };
      });

      // Record this character as missed
      if (!missedKana.some((k) => k.kana === activeKana.kana)) {
        setMissedKana((prev) => [...prev, activeKana]);
      }

      // -------------------------------------------------------------
      // Dynamic Clamped Review Queue Injections
      // -------------------------------------------------------------
      const basePoolSize = isMistakesOnlyRun ? missedKana.length : selectedKana.length;
      const injectionCap = Math.max(10, Math.ceil(basePoolSize * 0.5));

      if (injectedCount < injectionCap) {
        setInjectedCount((c) => c + 1);

        const remainingLength = kanaList.length - (currentIndex + 1);
        let offset = 4 + Math.floor(Math.random() * 5); // random 4-8

        if (remainingLength === 0) {
          offset = 1;
        } else if (remainingLength < offset) {
          offset = Math.max(2, Math.min(offset, remainingLength + 1));
        }

        const insertIndex = currentIndex + offset;
        const newQueue = [...kanaList];
        newQueue.splice(insertIndex, 0, activeKana);
        setKanaList(newQueue);
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
    setQuestionStartTime(Date.now()); // Reset question timer for next item

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
      clearRecoverySession();
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

    // Accurate calculation of total time spent in seconds
    let finalElapsedMs = accumulatedTimeRef.current;
    if (startTimeRef.current !== null) {
      finalElapsedMs += (Date.now() - startTimeRef.current);
    }
    const finalTimeSeconds = Math.max(1, Math.floor(finalElapsedMs / 1000));

    const calculatedAccuracy = correctAnswersCount / (correctAnswersCount + finalWrongAttemptsCount);
    const scoreVal = calculateScore(calculatedAccuracy, finalWrongAttemptsCount, finalTimeSeconds);
    const gradeLetter = getGrade(calculatedAccuracy).letter;

    // Log uncompleted questions as skipped/errors in SRS session stats
    const updatedSessionKanaStats = { ...sessionKanaStats };
    if (uncompletedCount > 0) {
      const uncompletedKana = kanaList.slice(currentIndex);
      uncompletedKana.forEach((char) => {
        if (!updatedSessionKanaStats[char.id]) {
          updatedSessionKanaStats[char.id] = {
            id: char.id,
            wrongAttempts: 1,
            timeSpent: 0,
            skipped: true
          };
        } else {
          updatedSessionKanaStats[char.id].skipped = true;
          updatedSessionKanaStats[char.id].wrongAttempts += 1;
        }
      });
    }

    // Save spaced repetition stats database updates!
    if (correctAnswersCount >= 2) {
      updateSrsData(updatedSessionKanaStats);
    }

    const statsObj = {
      config: activeConfig,
      totalQuestions: totalQuestionsCount,
      correctAnswers: correctAnswersCount,
      wrongAttempts: finalWrongAttemptsCount,
      accuracy: calculatedAccuracy,
      score: scoreVal,
      totalTime: finalTimeSeconds,
      avgTimePerQuestion: finalTimeSeconds / Math.max(1, correctAnswersCount),
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

    const configInfo = getQuizConfig(activeConfig);
    const fallbackStats = {
      ...statsObj,
      configKey: configInfo.configKey,
      configName: statsObj.configName || configInfo.configName,
      selectedIds: configInfo.selectedIds,
      selectedPreview: configInfo.selectedPreview,
      selectedCount: configInfo.selectedCount,
      scriptList: configInfo.scriptList,
      groupList: configInfo.groupList,
      isCustom: configInfo.isCustom,
      isReview: configInfo.isReview || false
    };

    setFinalStats(savedRunObj || fallbackStats);
    setIsNewRecord(pbFlag);
    setQuizFinished(true);
    clearRecoverySession();
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (quizFinished) return;

      // Handle shortcuts overlay toggle
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handlePauseToggle();
        return;
      }

      if (isPaused || showShortcutsHelp) return;

      if (e.key === "Control") {
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
  }, [currentIndex, quizFinished, isPaused, showShortcutsHelp, inputValue, activeKana, wrongAttempts, missedKana, time, inputStatus, questionStartTime]);

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
    <div className="space-y-3 sm:space-y-6 py-2 sm:py-4 max-w-4xl mx-auto relative px-2 sm:px-0">
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
        isPaused={isPaused}
        onPauseToggle={handlePauseToggle}
      />

      {/* Progress Bar */}
      <ProgressBar progress={completionFraction} />

      {/* Main Flashcard Card display */}
      <div className="py-3 sm:py-6">
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
      <div className="space-y-4 sm:space-y-6">
        <QuizInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleAnswerSubmit}
          status={inputStatus}
          disabled={isPaused || showShortcutsHelp || inputStatus === "correct"}
        />

        {/* Flow button controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowShortcutsHelp(true)}
            type="button"
            className="hidden sm:flex px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all duration-200 cursor-pointer items-center gap-1.5"
          >
            ⌨️ Shortcuts
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => finishSession(false)}
            type="button"
            className="hidden sm:flex px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all duration-200 cursor-pointer"
          >
            Finish Quiz
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRestart}
            type="button"
            className="hidden sm:flex px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all duration-200 cursor-pointer"
          >
            Restart
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSkip}
            type="button"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-brand-accent text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
          >
            Skip
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Pause Overlay Modal */}
      <AnimatePresence>
        {isPaused && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md p-8 rounded-3xl border border-slate-800 bg-brand-card/95 shadow-[0_0_50px_rgba(56,189,248,0.15)] text-center space-y-6"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center mx-auto text-brand-accent text-2xl">
                  ⏸️
                </div>
                <h2 className="text-2xl font-black text-slate-100 tracking-tight">Practice Paused</h2>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Your streak and timer are frozen. Take a break and resume when you are ready to continue!
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-900 bg-slate-950/40 grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Progress</span>
                  <span className="text-sm font-bold text-slate-200">{currentIndex} / {kanaList.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Time Elapsed</span>
                  <span className="text-sm font-bold text-slate-200 font-mono">
                    {Math.floor(time / 60).toString().padStart(2, "0")}:{(time % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handlePauseToggle}
                  type="button"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-accent to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs transition-all duration-300 shadow-[0_0_15px_rgba(56,189,248,0.2)] hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] cursor-pointer"
                >
                  Resume Practice
                </button>
                
                <button
                  onClick={() => {
                    setIsPaused(false);
                    handleRestart();
                  }}
                  type="button"
                  className="w-full py-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs font-bold text-slate-300 transition-all duration-200 cursor-pointer"
                >
                  Restart Practice
                </button>
                
                <button
                  onClick={() => {
                    setIsPaused(false);
                    finishSession(false);
                  }}
                  type="button"
                  className="w-full py-3 rounded-xl border border-rose-950/20 bg-rose-950/10 hover:bg-rose-900/20 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all duration-200 cursor-pointer"
                >
                  Finish & Show Results
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help Modal */}
      <AnimatePresence>
        {showShortcutsHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md p-8 rounded-3xl border border-slate-800 bg-brand-card/95 shadow-[0_0_50px_rgba(56,189,248,0.15)] text-center space-y-6"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center mx-auto text-brand-accent text-2xl font-black">
                  ⌨️
                </div>
                <h2 className="text-2xl font-black text-slate-100 tracking-tight">Keyboard Shortcuts</h2>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Practice more efficiently using these keyboard shortcuts:
                </p>
              </div>

              <div className="rounded-2xl border border-slate-900 bg-slate-950/40 divide-y divide-slate-900/60 text-left text-xs">
                <div className="flex items-center justify-between p-3.5">
                  <span className="text-slate-400 font-bold">Submit Answer</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 text-[10px] font-black text-brand-accent font-mono shadow">Enter / Space</kbd>
                </div>
                <div className="flex items-center justify-between p-3.5">
                  <span className="text-slate-400 font-bold">Skip Character</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 text-[10px] font-black text-brand-accent font-mono shadow">Ctrl</kbd>
                </div>
                <div className="flex items-center justify-between p-3.5">
                  <span className="text-slate-400 font-bold">Pause / Resume</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 text-[10px] font-black text-brand-accent font-mono shadow">Esc</kbd>
                </div>
                <div className="flex items-center justify-between p-3.5">
                  <span className="text-slate-400 font-bold">Toggle Shortcuts Menu</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-900 border border-slate-850 text-[10px] font-black text-brand-accent font-mono shadow">?</kbd>
                </div>
              </div>

              <button
                onClick={() => setShowShortcutsHelp(false)}
                type="button"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-accent to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs transition-all duration-300 shadow-[0_0_15px_rgba(56,189,248,0.2)] cursor-pointer"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
