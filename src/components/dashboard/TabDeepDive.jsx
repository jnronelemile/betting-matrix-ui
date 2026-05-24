import React from 'react';
import { AlertCircle, CheckCircle2, Ban, Zap, Info, ShieldCheck, Fingerprint, Trophy } from 'lucide-react';
import { Badge } from '../ui/Badge';

export default function TabDeepDive({ match }) {
  const leagueReport = match.leagueReport || [];
  const rejectedBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_WARNING');
  const validatedBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_CONFIRMED');
  const neutralBets = leagueReport.filter(r => r.Streak_Status === 'STREAK_NEUTRAL');
  const masterReason = match.masterReason || null;

  if (leagueReport.length === 0 && !match.isFinalPick) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-[1.5rem] border border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
        <Info size={32} className="mb-3 opacity-20" />
        <p className="text-xs font-mono uppercase tracking-widest text-center">No Deep-Dive Data Available<br/><span className="text-[9px] opacity-50 text-emerald-500">Only available for Master Matchups</span></p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. MASTER SELECTION HERO - Compact for Mobile */}
      {match.isFinalPick && (
        <div className="relative rounded-[1.5rem] p-6 lg:p-10 overflow-hidden bg-emerald-600 dark:bg-emerald-900 border border-emerald-400/30 shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-white pointer-events-none">
            <Trophy size={100} />
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
               <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/20">
                 <Trophy size={18} className="text-white" />
               </div>
               <span className="text-[10px] font-black text-emerald-50 uppercase tracking-[0.3em]">Master Selection</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl lg:text-3xl font-serif font-black text-white uppercase tracking-tight leading-tight">Strategic Validation</h3>
              <p className="text-emerald-50 max-w-3xl text-xs lg:text-sm leading-relaxed font-medium italic bg-black/20 p-4 rounded-2xl border border-white/10 shadow-inner">
                {masterReason || "Titanium Engine High-Reliability situational pick."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-3 py-1.5 rounded-full border border-emerald-400/20">
                <ShieldCheck size={12} /> Validated
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-3 py-1.5 rounded-full border border-emerald-400/20">
                <Zap size={12} /> Elite Synergy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Header Information - Downsized */}
      <div className="bg-slate-900 dark:bg-black rounded-[1.5rem] p-6 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 text-white pointer-events-none">
          <Fingerprint size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-3">
             <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
               <Fingerprint size={16} className="text-blue-400" />
             </div>
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Analytical Deep-Dive</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-serif font-black text-white tracking-tight leading-tight mb-2">
            Titanium <span className="text-blue-400">Black Box</span>
          </h2>
          <p className="text-slate-400 max-w-xl text-[10px] leading-relaxed font-medium italic">
            Audit complet des vetos de sécurité et preuves tactiques.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section: Validated */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
               <CheckCircle2 size={14} /> Validated Insights
            </div>
            <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">{validatedBets.length + neutralBets.length}</Badge>
          </div>

          <div className="flex flex-col gap-3">
            {[...validatedBets, ...neutralBets].map((bet, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg group">
                 <div className="flex items-start justify-between mb-3 gap-3">
                   <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                         <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${bet.Streak_Status === 'STREAK_CONFIRMED' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                           {bet.Streak_Status === 'STREAK_CONFIRMED' ? 'CONFIRMED' : 'NEUTRAL'}
                         </span>
                         <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">{bet.Type}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate">{bet.Marche}</h4>
                   </div>
                   <div className="bg-slate-900 dark:bg-white text-white dark:text-black px-2 py-1 rounded-lg font-mono font-black text-xs shrink-0">
                      @{bet.Cote_Ref}
                   </div>
                 </div>

                 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic mb-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-emerald-500 not-italic font-black uppercase mr-1.5 text-[8px]">Reason:</span>
                    {bet.Streak_Reason}
                 </p>

                 {bet.Score_Exact_Confirmation && (
                   <div className="flex items-center gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                      <Zap size={12} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-700 dark:text-slate-200 truncate">{bet.Score_Exact_Confirmation}</span>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>

        {/* Section: Vetos */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest">
               <Ban size={14} /> Security Vetos
            </div>
            <Badge variant="danger" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px]">{rejectedBets.length}</Badge>
          </div>

          <div className="flex flex-col gap-3">
            {rejectedBets.length > 0 ? rejectedBets.map((bet, idx) => (
              <div key={idx} className="bg-slate-50/50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/50 grayscale opacity-70 group hover:opacity-100 transition-all">
                 <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Ban size={10} className="text-rose-500 shrink-0" />
                      <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase truncate">{bet.Marche}</h4>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 font-mono shrink-0">@{bet.Cote_Ref}</span>
                 </div>
                 
                 <div className="p-2 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-medium text-slate-500 italic leading-relaxed">
                       {bet.Streak_Reason}
                    </p>
                 </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-slate-400">
                 <ShieldCheck size={32} className="mb-2 opacity-20 text-emerald-500" />
                 <p className="text-[9px] uppercase font-black tracking-widest text-center">Security OK</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
