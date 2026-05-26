import { useRef, useEffect } from "react";
import clsx from "clsx";

export default function QuizInput({ value, onChange, status, disabled }) {
  const inputRef = useRef(null);

  // Automatically refocus when character changes or when status resets
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [status, disabled]);

  // Keep input focused even if user clicks elsewhere (only for desktop)
  const handleBlur = () => {
    if (!disabled) {
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (window.innerWidth < 768);
      if (!isMobile) {
        // Re-focus on next tick for desktop keyboards
        setTimeout(() => {
          inputRef.current?.focus();
        }, 10);
      }
    }
  };

  return (
    <div
      className={clsx(
        "w-full max-w-xs sm:max-w-sm mx-auto",
        status === "correct" && "correct-pop",
        status === "wrong" && "shake"
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().trim())}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="Enter romaji..."
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        className={clsx(
          "w-full text-center py-2.5 sm:py-4 px-4 sm:px-6 text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl border text-slate-100 placeholder-slate-600 transition-all duration-200 outline-none",
          {
            "border-slate-800 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 bg-slate-950/60": status === "typing",
            "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-950/20": status === "correct",
            "border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-rose-950/20": status === "wrong"
          }
        )}
      />
      <div className="hidden sm:flex justify-between items-center px-2 mt-3">
        <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase flex items-center gap-1">
          <kbd className="key-badge px-1 py-0.5 rounded text-[9px]">Enter / Space</kbd> Submit
        </span>
        <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase flex items-center gap-1">
          <kbd className="key-badge px-1 py-0.5 rounded text-[9px]">Ctrl</kbd> Skip
        </span>
      </div>
    </div>
  );
}
