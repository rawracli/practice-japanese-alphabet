

export default function ProgressBar({ progress }) {
  // progress should be a decimal between 0 and 1
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="w-full">
      <div className="w-full h-1.5 bg-slate-900 border border-slate-800/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-accent to-blue-500 progress-bar-transition shadow-[0_0_10px_#38bdf8]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 px-1">
        <span>Completion</span>
        <span className="text-brand-accent">{percentage}%</span>
      </div>
    </div>
  );
}
