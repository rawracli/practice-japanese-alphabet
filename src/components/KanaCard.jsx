import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { getFontClassName } from "../utils/fonts";

export default function KanaCard({ character, totalWrongForCurrent, selectedFont }) {
  // Generate a helpful hint if the user has tried multiple times
  const getHint = () => {
    if (totalWrongForCurrent === 0) return null;
    
    const ans = character.romaji;
    if (totalWrongForCurrent === 1) {
      return `Length: ${ans.length} letter${ans.length > 1 ? "s" : ""}`;
    }
    
    // For 2 or more mistakes, show the first letter
    return `Starts with: "${ans[0].toUpperCase()}"`;
  };

  const hint = getHint();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative w-full max-w-sm mx-auto aspect-square flex flex-col items-center justify-center p-8 rounded-3xl border border-brand-accent/20 bg-brand-card/60 glass-panel shadow-[0_0_50px_rgba(56,189,248,0.05)] select-none"
    >
      {/* Outer absolute glows */}
      <div className="absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-tr from-brand-accent/10 to-transparent pointer-events-none" />

      {/* Script Tag indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          {character.script}
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800/80 text-brand-accent border border-brand-accent/15">
          {character.group}
        </span>
      </div>

      {/* Main Japanese character */}
      <div
        className={clsx(
          "text-8xl md:text-9xl font-black text-slate-100 tracking-normal drop-shadow-[0_0_15px_rgba(248,250,252,0.3)] transition-all duration-300",
          getFontClassName(selectedFont)
        )}
      >
        {character.kana}
      </div>

      {/* Help text or dynamic hints */}
      <div className="h-10 mt-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {hint ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs font-bold text-slate-400 bg-slate-950/60 border border-slate-800/60 px-3 py-1.5 rounded-full flex items-center gap-1.5"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              Hint — {hint}
            </motion.div>
          ) : (
            <motion.div
              key="tip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase"
            >
              Type the romaji and press Enter
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
