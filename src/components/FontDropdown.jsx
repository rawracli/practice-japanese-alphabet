import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { JAPANESE_FONTS } from "../utils/fonts";

export default function FontDropdown({ selectedFont, onFontChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFont = JAPANESE_FONTS.find((f) => f.id === selectedFont) || JAPANESE_FONTS[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 text-slate-300 hover:text-slate-100 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider select-none focus:outline-none"
      >
        <span className="flex items-center gap-2">
          {/* Small Preview Box */}
          <span
            className={clsx(
              "w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-sm font-black text-brand-accent shadow-[0_0_8px_rgba(56,189,248,0.2)]",
              activeFont.className
            )}
          >
            {activeFont.previewText}
          </span>
          <span className="truncate max-w-[120px] sm:max-w-none">{activeFont.name}</span>
        </span>
        <svg
          className={clsx(
            "w-4 h-4 text-slate-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Floating Menu Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2.5 w-72 sm:w-80 rounded-2xl border border-slate-800 bg-brand-card/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-50 overflow-hidden transform origin-top-right py-1"
          >
            <div className="px-3.5 py-2 border-b border-slate-900">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase">
                Choose Practice Typeface
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-900/40">
              {JAPANESE_FONTS.map((font) => {
                const isActive = font.id === selectedFont;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => {
                      onFontChange(font.id);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-900/60 transition-colors cursor-pointer group",
                      isActive && "bg-brand-accent/5"
                    )}
                  >
                    <div className="space-y-0.5 text-left">
                      <span
                        className={clsx(
                          "block text-sm font-extrabold text-slate-200 group-hover:text-brand-accent transition-colors",
                          font.className,
                          isActive && "text-brand-accent"
                        )}
                      >
                        {font.name}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-semibold leading-normal">
                        {font.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Visual Character Character Preview Badge */}
                      <span
                        className={clsx(
                          "w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-850 flex items-center justify-center text-lg font-black transition-all",
                          font.className,
                          isActive
                            ? "text-brand-accent border-brand-accent/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                            : "text-slate-400 group-hover:text-slate-200"
                        )}
                      >
                        {font.previewText}
                      </span>

                      {/* Active checkmark dot indicator */}
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_6px_#38bdf8]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
