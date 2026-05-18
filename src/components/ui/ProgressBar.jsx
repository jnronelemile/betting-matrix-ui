import React from 'react';

export function ProgressBar({ value, max = 1, label, colorClass = 'bg-emerald-500 dark:bg-emerald-400', displayValue }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-1.5 gap-1">
        {label && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide truncate">{label}</span>}
        <span className="font-mono text-sm text-slate-800 dark:text-slate-200 font-medium shrink-0">
          {displayValue !== undefined ? displayValue : `${(percentage).toFixed(1)}%`}
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-300 dark:border-slate-700/50 transition-colors duration-300">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
