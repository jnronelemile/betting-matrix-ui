import React from 'react';
import { Badge } from '../ui/Badge';
import { 
  Trophy, 
  Zap, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Flame, 
  PieChart, 
  ArrowUpRight,
  PlusCircle,
  LayoutGrid
} from 'lucide-react';

export default function TicketsView({ assembled, finals, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono uppercase tracking-widest">Compiling Selections...</p>
      </div>
    );
  }

  if (!assembled && !finals) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
        <Trophy size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-mono uppercase tracking-widest text-center">No Master Selections Available<br/><span className="text-[10px] opacity-50">Check data synchronization</span></p>
      </div>
    );
  }

  const tickets = assembled ? Object.entries(assembled) : [];

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full">
      {/* 1. Header Hero */}
      <div className="relative rounded-[2.5rem] p-8 lg:p-12 overflow-hidden bg-slate-900 dark:bg-black border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 text-white">
          <Trophy size={200} />
        </div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
               <Trophy size={24} className="text-emerald-400" />
             </div>
             <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em]">Proprietary Master Selections</span>
          </div>
          <h2 className="text-4xl lg:text-6xl font-serif font-black text-white tracking-tighter leading-tight">
            Titanium <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Master Selections</span>
          </h2>
          <p className="text-slate-400 max-w-2xl text-sm lg:text-base leading-relaxed font-medium italic">
            "Combining high-probability situational trends with engine-calibrated Value. Each selection is cross-validated by the Master Series Matrix before final assembly."
          </p>
        </div>
      </div>

      {/* 2. Final Selections Summary (Horizontal Scroll) */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <LayoutGrid size={20} className="text-emerald-500" />
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Individual Picks</h3>
          </div>
          <Badge variant="info" className="px-3 py-1 font-mono">{finals?.Selections?.length || 0} TOTAL SELECTIONS</Badge>
        </div>
        <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 px-2">
          {finals?.Selections?.map((sel, idx) => (
            <div 
              key={idx}
              className="min-w-[280px] bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl hover:border-emerald-500/50 transition-all group relative"
            >
              <div className="flex items-center justify-between mb-4">
                <Badge variant={sel.Tier === 1 ? 'success' : 'info'} className="text-[9px] px-2 py-0.5">TIER {sel.Tier}</Badge>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {((sel.Prob || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm mb-1 leading-tight">{sel.Match}</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-4 font-bold">{sel.League}</p>
              
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Market</span>
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{sel.Marche}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Odds</span>
                  <span className="text-sm font-black font-mono">@{sel.Cote_Ref}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Assembled Tickets */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {tickets.map(([key, ticket]) => (
          <div key={key} className="flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl transition-all hover:shadow-emerald-500/5 group">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 relative">
               {/* Ticket Header */}
               <div className="flex items-start justify-between mb-6">
                 <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2">
                     <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg">CAT {ticket.categorie}</span>
                     <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{ticket.nom}</h3>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <PieChart size={12} className="text-emerald-500" />
                        {ticket.legs?.length || 0} Selections
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <ShieldCheck size={12} className="text-blue-500" />
                        {ticket.metrics?.fiabilite_moyenne || '0'}% Reliability
                      </div>
                   </div>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Odds</span>
                    <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">@{ticket.metrics?.cote_totale?.toFixed(2) || '0.00'}</span>
                 </div>
               </div>

               {/* Stats Row */}
               <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Potential Gain (10U)</span>
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono">{ticket.metrics?.gain_10u || '0'}U</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Implic. Prob</span>
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono">{(ticket.metrics?.prob_implicite ? (ticket.metrics.prob_implicite * 100).toFixed(2) : '0.00')}%</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group/item">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Correlation</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">{ticket.metrics?.badge_name || 'N/A'}</span>
                      <span className="text-lg">{ticket.metrics?.badge_correlation || ''}</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Ticket Legs */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
              {ticket.legs?.map((leg, lidx) => (
                <div key={lidx} className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group/leg hover:border-emerald-500/30 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-xl">{leg.confidence_badge || '🎯'}</div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight">{leg.Match}</span>
                        {leg.Super_Signal && <Zap size={10} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        <span>{leg.League}</span>
                        <span className="text-slate-200 dark:text-slate-800">|</span>
                        <span className="text-emerald-500/70">{leg.family_name || 'Pick'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-800 dark:text-emerald-400 uppercase tracking-tighter">{leg.Marche}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-400 font-mono">@{leg.Cote_Ref || '0.00'}</span>
                      <span className="text-[9px] font-black text-emerald-500 font-mono">{((leg.Prob || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ticket Footer Action */}
            <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <TrendingUp size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Expected Value Validated</span>
                  </div>
                  <button className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-black transition-all shadow-xl group/btn">
                    Details Matrix <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Strategic Context Section */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-10 flex flex-col lg:flex-row items-center gap-8 shadow-inner">
        <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
          <Flame size={48} className="text-emerald-500" />
        </div>
        <div className="flex flex-col gap-3 text-center lg:text-left">
          <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">ColdBetdrox Logic: The Anti-Variance Shield</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Our tickets are assembled using the <strong className="text-emerald-500">Anti-Variance</strong> algorithm. We don't just look for high odds; we seek mathematical synergy between situational contexts (H2H, Team Streaks, Justice Tension). Every "Leg" has passed the 10-match streak regularity test.
          </p>
        </div>
      </div>
    </div>
  );
}
