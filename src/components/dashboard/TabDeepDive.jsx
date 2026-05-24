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
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
        <Info size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-mono uppercase tracking-widest text-center">No Deep-Dive Data Available<br/><span className="text-[10px] opacity-50 text-emerald-500">Only available for Master Matchups</span></p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. MASTER SELECTION HERO (Relocated from Tactical) */}
      {match.isFinalPick && (
        <div className="relative rounded-[2.5rem] p-8 lg:p-10 overflow-hidden bg-emerald-600 dark:bg-emerald-900 border border-emerald-400/30 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-white pointer-events-none">
            <Trophy size={150} />
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                 <Trophy size={24} className="text-white" />
               </div>
               <span className="text-[11px] font-black text-emerald-50 uppercase tracking-[0.4em]">Titanium Master Selection</span>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-2xl lg:text-4xl font-serif font-black text-white uppercase tracking-tighter leading-tight">Strategic Validation Confirmed</h3>
              <p className="text-emerald-50 max-w-4xl text-sm lg:text-base leading-relaxed font-medium italic bg-black/20 p-6 rounded-[2rem] border border-white/10 shadow-inner">
                {masterReason || "This match has been identified by the Titanium Engine as a High-Reliability situational pick. It combines positive justice tension with elite regularity streaks and verified value odds."}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-4 py-2 rounded-full border border-emerald-400/20">
                <ShieldCheck size={14} /> Tier 1 Validated
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-700/40 px-4 py-2 rounded-full border border-emerald-400/20">
                <Zap size={14} /> Elite Signal Synergy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Header Information */}
      <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 lg:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
          <Fingerprint size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
               <Fingerprint size={20} className="text-blue-400" />
             </div>
             <span className="text-xs font-black text-blue-400 uppercase tracking-[0.4em]">Titanium Decision Engine</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-serif font-black text-white tracking-tighter leading-tight mb-4">
            Analytical <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Deep-Dive</span>
          </h2>
          <p className="text-slate-400 max-w-2xl text-sm leading-relaxed font-medium italic">
            Audit complet de tous les marchés analysés par le moteur. Visualisez les sélections validées, les vetos de sécurité et les preuves tactiques.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section: Validated & Neutral Insights */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
               <CheckCircle2 size={16} /> Validated Selections
            </div>
            <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono">{validatedBets.length + neutralBets.length}</Badge>
          </div>

          <div className="flex flex-col gap-4">
            {[...validatedBets, ...neutralBets].map((bet, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl hover:border-emerald-500/30 transition-all group">
                 <div className="flex items-start justify-between mb-4">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${bet.Streak_Status === 'STREAK_CONFIRMED' ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                           {bet.Streak_Status === 'STREAK_CONFIRMED' ? 'CONFIRMED' : 'NEUTRAL'}
                         </span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{bet.Type}</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{bet.Marche}</h4>
                   </div>
                   <div className="bg-slate-900 dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-xl font-mono font-black text-sm shadow-lg">
                      @{bet.Cote_Ref}
                   </div>
                 </div>

                 <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic mb-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <span className="text-emerald-500 not-italic font-black uppercase mr-2 text-[10px]">Reason:</span>
                    {bet.Streak_Reason}
                 </p>

                 {bet.Score_Exact_Confirmation && (
                   <div className="flex items-center gap-3 bg-emerald-500/5 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/10">
                      <Zap size={14} className="text-emerald-500 fill-emerald-500 animate-pulse" />
                      <div className="flex flex-col">
                         <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Tactical Proof</span>
                         <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{bet.Score_Exact_Confirmation}</span>
                      </div>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>

        {/* Section: Engine VETOS */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest">
               <Ban size={16} /> Engine Vetos (Security Filter)
            </div>
            <Badge variant="danger" className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-mono">{rejectedBets.length}</Badge>
          </div>

          <div className="flex flex-col gap-4">
            {rejectedBets.length > 0 ? rejectedBets.map((bet, idx) => (
              <div key={idx} className="bg-slate-50/50 dark:bg-slate-950/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800/50 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-500 rounded-lg shadow-lg">
                        <Ban size={12} className="text-white" />
                      </div>
                      <h4 className="text-base font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{bet.Marche}</h4>
                    </div>
                    <span className="text-xs font-black text-slate-400 font-mono">@{bet.Cote_Ref}</span>
                 </div>
                 
                 <div className="p-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] block mb-1">Veto Reason</span>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                       {bet.Streak_Reason}
                    </p>
                 </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center p-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] text-slate-400 bg-white/30 dark:bg-slate-900/30">
                 <ShieldCheck size={40} className="mb-3 opacity-20 text-emerald-500" />
                 <p className="text-[10px] uppercase font-black tracking-widest text-center">Security Check Passed<br/><span className="opacity-50 text-[8px]">No Tactical Vetos for this Selection</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
