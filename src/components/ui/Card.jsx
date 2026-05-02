import React from 'react';

export function Card({ children, className = '', title, titleIcon }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm ${className}`}>
      {title && (
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center gap-2">
          {titleIcon && <span className="text-slate-400">{titleIcon}</span>}
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</h3>
        </div>
      )}
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </div>
  );
}
