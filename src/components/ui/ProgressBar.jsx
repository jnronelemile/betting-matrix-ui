import React from 'react';
import { calculatePercentage } from './ProgressBar.logic';

export function ProgressBar({ value, max = 1, label, colorClass = 'bg-emerald-400', displayValue }) {
  const percentage = calculatePercentage(value, max);
  
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-1.5 gap-1">
        {label && <span className="text-xs text-slate-400 font-medium uppercase tracking-wide truncate">{label}</span>}
        <span className="font-mono text-sm text-slate-200 font-medium shrink-0">
          {displayValue !== undefined ? displayValue : `${(percentage).toFixed(1)}%`}
        </span>
      </div>
      <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
