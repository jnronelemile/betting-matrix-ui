import React, { useState } from 'react';
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
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  AlertCircle,
  Clock
} from 'lucide-react';

const LEAGUE_NAME_TO_CODE = {
  'Premier League': 'PL',
  'LaLiga': 'LIGA',
  'Serie A': 'SERIEA',
  'Ligue 1': 'LIG1',
  'Bundesliga': 'BUND',
  'Eredivisie': 'EDV',
  'Primeira Liga': 'POR1'
};

const TicketLeg = ({ leg, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  
  const leagueCode = LEAGUE_NAME_TO_CODE[leg.League] || 'ALL';
  
  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col group/leg hover:border-emerald-500/30 transition-all shadow-sm overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="text-xl group-hover/leg:scale-110 transition-transform">{leg.confidence_badge || '🎯'}</div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight">{leg.Match}</span>
              {leg.Super_Signal && <Zap size={10} className="text-amber-500 fill-amber-500 animate-pulse" />}
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              <span>{leg.League}</span>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <span className="text-emerald-500/70 group-hover/leg:text-emerald-500 transition-colors">Click to {expanded ? 'collapse' : 'expand details'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-800 dark:text-emerald-400 uppercase tracking-tighter">{leg.Marche}</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400 font-mono">@{leg.Cote_Ref || '0.00'}</span>
              <span className={`text-[9px] font-black font-mono ${leg.Prob > 0.7 ? 'text-emerald-500' : 'text-blue-500'}`}>
                {((leg.Prob || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-50 dark:border-slate-900/50 bg-slate-50/30 dark:bg-slate-900/30 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col gap-3">
            {/* Reason */}
            {leg.Streak_Reason && (
              <div className="flex items-start gap-2 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <Info size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {leg.Streak_Reason}
                </p>
              </div>
            )}
            
            {/* Mini Goal Distribution */}
            {leg.Goal_Distribution && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Home Scored / Away Conceded</span>
                  <div className="flex gap-0.5 h-6 items-end">
                    {leg.Goal_Distribution.home_scored?.map((v, i) => (
                      <div key={i} className="flex-1 bg-emerald-500/30 rounded-t-[1px]" style={{ height: `${Math.max(v * 20, 10)}%` }} />
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Away Scored / Home Conceded</span>
                  <div className="flex gap-0.5 h-6 items-end">
                    {leg.Goal_Distribution.away_scored?.map((v, i) => (
                      <div key={i} className="flex-1 bg-blue-500/30 rounded-t-[1px]" style={{ height: `${Math.max(v * 20, 10)}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(leg.Match, leagueCode);
              }}
              className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
            >
              Analysis Matrix <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TicketsView({ assembled, finals, loading, onNavigateToMatch }) {
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
  
  // Stats calculation
  const totalSelections = finals?.Selections?.length || 0;
  const avgProb = totalSelections > 0 
    ? (finals.Selections.reduce((acc, s) => acc + (s.Prob || 0), 0) / totalSelections * 100).toFixed(1)
    : 0;
  const avgOdds = totalSelections > 0
    ? (finals.Selections.reduce((acc, s) => acc + (s.Cote_Ref || 0), 0) / totalSelections).toFixed(2)
    : 0;

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto w-full pb-20">
      
      {/* 1. Header Hero with Stats */}
      <div className="relative rounded-[2.5rem] p-8 lg:p-12 overflow-hidden bg-slate-900 dark:bg-black border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 text-white pointer-events-none">
          <Trophy size={200} />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                 <Trophy size={24} className="text-emerald-400" />
               </div>
               <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em]">Proprietary Master Selections</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-serif font-black text-white tracking-tighter leading-tight">
              Titanium <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Master Hub</span>
            </h2>
            <p className="text-slate-400 max-w-2xl text-sm lg:text-base leading-relaxed font-medium italic">
              "Combining high-probability situational trends with engine-calibrated Value. Each selection is cross-validated by the Master Series Matrix before final assembly."
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl flex flex-col gap-1">
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active Picks</span>
              <span className="text-2xl font-black text-white font-mono">{totalSelections}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl flex flex-col gap-1">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Avg Probability</span>
              <span className="text-2xl font-black text-white font-mono">{avgProb}%</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl flex flex-col gap-1">
              <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Avg Odds</span>
              <span className="text-2xl font-black text-white font-mono">@{avgOdds}</span>
            </div>
            <div className="col-span-full bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-emerald-400 uppercase">Engine Status</span>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">V8.5 ULTRA CALIBRATED</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i*200}ms` }} />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Final Selections Summary (Horizontal Scroll) */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <LayoutGrid size={20} className="text-emerald-500" />
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Individual Master Picks</h3>
          </div>
          <Badge variant="info" className="px-3 py-1 font-mono">{totalSelections} TOTAL</Badge>
        </div>
        
        <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 px-2 snap-x">
          {finals?.Selections?.map((sel, idx) => (
            <div 
              key={idx}
              onClick={() => onNavigateToMatch(sel.Match, LEAGUE_NAME_TO_CODE[sel.League] || 'ALL')}
              className="min-w-[320px] snap-start bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl hover:border-emerald-500/50 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98] flex flex-col gap-4"
            >
              <div className="absolute -right-2 -top-2 opacity-5 text-slate-900 dark:text-white group-hover:opacity-10 transition-opacity">
                <Trophy size={80} />
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex gap-2">
                  <Badge variant={sel.Tier === 1 ? 'success' : 'info'} className="text-[9px] px-2 py-0.5">TIER {sel.Tier}</Badge>
                  {sel.Streak_Status === 'STREAK_CONFIRMED' ? (
                    <Badge variant="success" className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-600 border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck size={10} /> CONFIRMÉ
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[9px] px-2 py-0.5 flex items-center gap-1">
                      <Info size={10} /> NEUTRE
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {((sel.Prob || 0) * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="relative z-10">
                <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm mb-1 leading-tight">{sel.Match}</h4>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                  <span>{sel.League}</span>
                  {sel.Heure && (
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      <Clock size={10} /> {sel.Heure}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Market</span>
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{sel.Marche}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Odds</span>
                  <span className="text-sm font-black font-mono">@{sel.Cote_Ref}</span>
                </div>
              </div>

              {/* Live Recommendation Section */}
              {sel.Live_Betting_Recommendation && sel.Live_Betting_Recommendation.length > 0 && (
                <div className="mt-auto relative z-10 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex flex-col gap-2">
                   <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                       <Zap size={10} className="fill-rose-500" /> Live Signal
                     </span>
                     <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                       {(sel.Live_Betting_Recommendation[0].Force * 100).toFixed(0)}%
                     </span>
                   </div>
                   <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                     {sel.Live_Betting_Recommendation[0].Signal}
                   </p>
                   <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" 
                        style={{ width: `${sel.Live_Betting_Recommendation[0].Force * 100}%` }}
                      />
                   </div>
                </div>
              )}
              
              <div className="mt-2 w-full py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all text-center">
                Analysis Matrix
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Assembled Tickets Section */}
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <PieChart size={20} className="text-blue-500" />
          <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Assembled Strategies</h3>
        </div>

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
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Gain (10U)</span>
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

              {/* Ticket Legs - New Component */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
                {ticket.legs?.map((leg, lidx) => (
                  <TicketLeg key={lidx} leg={leg} onNavigate={onNavigateToMatch} />
                ))}
              </div>

              {/* Ticket Footer Action */}
              <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <TrendingUp size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Expected Value Validated</span>
                    </div>
                    <button className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all group/btn">
                      Verify Strategy <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Strategic Context Section */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-10 shadow-inner">
        <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0 relative">
          <div className="absolute inset-0 bg-emerald-500/5 animate-ping rounded-[2.5rem]"></div>
          <Flame size={64} className="text-emerald-500 relative z-10" />
        </div>
        <div className="flex flex-col gap-4 text-center lg:text-left">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">ColdBetdrox Logic: The Anti-Variance Shield</h4>
          <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Our tickets are assembled using the <strong className="text-emerald-500">Anti-Variance</strong> algorithm. We don't just look for high odds; we seek mathematical synergy between situational contexts (H2H, Team Streaks, Justice Tension). Every "Leg" has passed the 10-match streak regularity test.
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start mt-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <ShieldCheck size={16} className="text-emerald-500" /> Situational Proof
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Target size={16} className="text-blue-500" /> Justice Calibration
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Zap size={16} className="text-amber-500" /> Signal Synergy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
