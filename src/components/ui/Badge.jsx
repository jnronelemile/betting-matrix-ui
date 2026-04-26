import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300',
    success: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
    danger: 'bg-rose-400/10 text-rose-400 border border-rose-400/20',
    info: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
    warning: 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
