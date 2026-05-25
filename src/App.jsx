import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Leaderboard from "./pages/Leaderboard";
import PageTransition from "./components/PageTransition";
import { kanaData } from "./data/kanaData";
import { loadSelectedIds, saveSelectedIds } from "./utils/storage";

function QuizRouteWrapper({ selectedKana, config, selectedFont, setSelectedFont }) {
  if (selectedKana.length === 0) {
    return <Navigate to="/" replace state={{ showSelectionError: true }} />;
  }
  return (
    <Quiz
      selectedKana={selectedKana}
      config={config}
      selectedFont={selectedFont}
      setSelectedFont={setSelectedFont}
    />
  );
}

function AppShell({ selectedIds, setSelectedIds, selectedFont, setSelectedFont, selectedKana, theme, setTheme }) {
  const location = useLocation();
  const isQuizPage = location.pathname === "/quiz";

  return (
    <div className="min-h-screen bg-brand-bg text-slate-100 flex flex-col justify-between selection:bg-brand-accent/30 selection:text-brand-accent relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      {/* Main Header */}
      <header className="border-b border-slate-900 bg-brand-card/45 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 group cursor-pointer focus:outline-none shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-accent to-blue-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-[0_0_12px_rgba(56,189,248,0.35)] transition-all duration-300 group-hover:scale-[1.05]">
              か
            </div>
            <span className="font-black text-sm tracking-widest text-slate-200 uppercase group-hover:text-brand-accent transition-colors duration-200">
              Kana<span className="text-brand-accent">Sensei</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Quick Header Nav Options */}
            {!isQuizPage && (
              <nav className="flex items-center gap-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider mr-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    clsx(
                      "transition-colors duration-150 hover:text-slate-100 cursor-pointer",
                      isActive ? "text-brand-accent font-extrabold" : "text-slate-400"
                    )
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/leaderboard"
                  className={({ isActive }) =>
                    clsx(
                      "transition-colors duration-150 hover:text-slate-100 cursor-pointer",
                      isActive ? "text-brand-accent font-extrabold" : "text-slate-400"
                    )
                  }
                >
                  Leaderboards
                </NavLink>
              </nav>
            )}

            {/* Accessible Theme Switcher */}
            <div className="relative">
              <select
                id="global-theme-switcher"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-[10px] sm:text-xs font-extrabold text-slate-300 outline-none focus:border-brand-accent cursor-pointer transition-all duration-200"
                title="Switch Theme"
              >
                <option value="theme-dark">🌌 Dark</option>
                <option value="theme-light">☀️ Light</option>
                <option value="theme-midnight">🌃 Midnight</option>
                <option value="theme-amoled">🕶️ AMOLED</option>
                <option value="theme-neon">🌈 Neon</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Page Canvas with Route Transitions */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6 md:py-10 z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <Home
                    config={selectedIds}
                    setConfig={setSelectedIds}
                    totalSelected={selectedKana.length}
                    selectedFont={selectedFont}
                    setSelectedFont={setSelectedFont}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/quiz"
              element={
                <PageTransition>
                  <QuizRouteWrapper
                    selectedKana={selectedKana}
                    config={selectedIds}
                    selectedFont={selectedFont}
                    setSelectedFont={setSelectedFont}
                  />
                </PageTransition>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <PageTransition>
                  <Leaderboard />
                </PageTransition>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Clean Branding Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 md:py-8 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            &copy; {new Date().getFullYear()} KANASENSEI. Built with React + Vite + TailwindCSS.
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Offline Ready
            </span>
            <span>&bull;</span>
            <span>localStorage Persistence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("kana_practice_theme");
      return saved || "theme-dark";
    } catch {
      return "theme-dark";
    }
  });

  // Apply theme class to document body whenever theme state changes
  useEffect(() => {
    const bodyClass = document.body.classList;
    bodyClass.forEach(c => {
      if (c.startsWith("theme-")) {
        bodyClass.remove(c);
      }
    });
    bodyClass.add(theme);
    
    try {
      localStorage.setItem("kana_practice_theme", theme);
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  }, [theme]);

  // State for all explicitly selected kana IDs
  const [selectedIds, setSelectedIds] = useState(() => {
    const saved = loadSelectedIds();
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    // Default: Hiragana Main Kana
    return kanaData
      .filter((char) => char.script === "hiragana" && char.group === "main")
      .map((char) => char.id);
  });

  // State for the active practice typeface
  const [selectedFont, setSelectedFont] = useState(() => {
    try {
      const saved = localStorage.getItem("kana_practice_font");
      return saved || "noto-sans-jp";
    } catch {
      return "noto-sans-jp";
    }
  });

  // Save selectedIds to localStorage whenever they change
  useEffect(() => {
    saveSelectedIds(selectedIds);
  }, [selectedIds]);

  // Save selectedFont to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("kana_practice_font", selectedFont);
    } catch (e) {
      console.error("Failed to save font selection:", e);
    }
  }, [selectedFont]);

  // Dynamically resolve active selected characters
  const selectedKana = React.useMemo(() => {
    return kanaData.filter((char) => selectedIds.includes(char.id));
  }, [selectedIds]);

  return (
    <BrowserRouter>
      <AppShell
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        selectedFont={selectedFont}
        setSelectedFont={setSelectedFont}
        selectedKana={selectedKana}
        theme={theme}
        setTheme={setTheme}
      />
    </BrowserRouter>
  );
}
