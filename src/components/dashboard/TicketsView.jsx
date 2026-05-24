import React, { useState, useMemo } from 'react';
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
  Clock,
  Search,
  Filter,
  List,
  BarChart3,
  MousePointer2
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
            {leg.Streak_Reason && (
              <div className="flex items-start gap-2 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <Info size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {leg.Streak_Reason}
                </p>
              </div>
            )}
            
            {leg.Goal_Distribution && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Home S / Away C</span>
                  <div className="flex gap-0.5 h-6 items-end">
                    {leg.Goal_Distribution.home_scored?.map((v, i) => (
                      <div key={i} className="flex-1 bg-emerald-500/30 rounded-t-[1px]" style={{ height: `${Math.max(v * 20, 10)}%` }} />
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Away S / Home C</span>
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
  const [activeView, setActiveView] = useState('summary'); // 'summary', 'strategies', 'picks'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [sortBy, setSortBy] = useState('prob'); // 'prob', 'odds'

  const tickets = assembled ? Object.entries(assembled) : [];
  
  // Memoized calculations
  const totalSelections = finals?.Selections?.length || 0;
  const avgProb = totalSelections > 0 
    ? (finals.Selections.reduce((acc, s) => acc + (s.Prob || 0), 0) / totalSelections * 100).toFixed(1)
    : 0;
  const avgOdds = totalSelections > 0
    ? (finals.Selections.reduce((acc, s) => acc + (s.Cote_Ref || 0), 0) / totalSelections).toFixed(2)
    : 0;

  const filteredPicks = useMemo(() => {
    if (!finals?.Selections) return [];
    return finals.Selections
      .filter(p => {
        const matchesSearch = p.Match.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.League.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTier = filterTier === 'ALL' || p.Tier === parseInt(filterTier);
        return matchesSearch && matchesTier;
      })
      .sort((a, b) => {
        if (sortBy === 'prob') return b.Prob - a.Prob;
        if (sortBy === 'odds') return b.Cote_Ref - a.Cote_Ref;
        return 0;
      });
  }, [finals, searchQuery, filterTier, sortBy]);

  const categories = useMemo(() => {
    const cats = {};
    tickets.forEach(([key, t]) => {
      const c = t.categorie || 'Other';
      if (!cats[c]) cats[c] = [];
      cats[c].push([key, t]);
    });
    return cats;
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono uppercase tracking-widest">Compiling Master Selections...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-32">
      
      {/* 1. INTERNAL NAVIGATION MENU */}
      <div className="sticky top-0 z-40 -mx-4 px-4 lg:mx-0 lg:px-0 py-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b lg:border-none border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit mx-auto lg:mx-0">
          {[
            { id: 'summary', label: 'Overview', icon: <BarChart3 size={16} /> },
            { id: 'strategies', label: 'Strategies', icon: <PieChart size={16} /> },
            { id: 'picks', label: 'All Picks', icon: <List size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                ${activeView === tab.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: SUMMARY */}
      {activeView === 'summary' && (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Hero Stats */}
          <div className="relative rounded-[2.5rem] p-8 lg:p-12 overflow-hidden bg-slate-900 dark:bg-black border border-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-10 text-white pointer-events-none">
              <Trophy size={200} />
            </div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                     <Trophy size={24} className="text-emerald-400" />
                   </div>
                   <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em]">Proprietary Master Hub</span>
                </div>
                <h2 className="text-5xl lg:text-7xl font-serif font-black text-white tracking-tighter leading-tight">
                  Titanium <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Master</span>
                </h2>
                <p className="text-slate-400 max-w-xl text-sm lg:text-base leading-relaxed font-medium italic">
                  "Combinant algorithmes de variance négative et calibration engine V8.5. Chaque sélection est le fruit d'une triple validation : Probabilité Pure, Situational Streak et Justice Tension."
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] flex flex-col gap-1">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Active Picks</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono">{totalSelections}</span>
                    <span className="text-xs text-slate-500 font-bold">TOTAL</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] flex flex-col gap-1">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Avg Probability</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono">{avgProb}%</span>
                  </div>
                </div>
                <div className="col-span-full bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between group cursor-pointer hover:bg-emerald-500/20 transition-all" onClick={() => setActiveView('strategies')}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl">
                      <ShieldCheck size={28} className="text-emerald-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Strategy Check</span>
                      <span className="text-lg font-bold text-white uppercase tracking-widest">{tickets.length} Strategies Active</span>
                    </div>
                  </div>
                  <ArrowUpRight size={24} className="text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Selection: Top Tiers */}
          <div className="flex flex-col gap-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Elite Picks (Tier 1)</h3>
                <button onClick={() => setActiveView('picks')} className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:underline">View All Picks</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {finals?.Selections?.filter(s => s.Tier === 1).slice(0, 3).map((sel, idx) => (
                   <div 
                    key={idx}
                    onClick={() => onNavigateToMatch(sel.Match, LEAGUE_NAME_TO_CODE[sel.League] || 'ALL')}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl hover:border-emerald-500/50 transition-all group cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform">
                      <Trophy size={100} />
                    </div>
                    <div className="flex justify-between items-start mb-6">
                       <Badge variant="success" className="bg-emerald-500 text-white shadow-lg">ELITE TIER 1</Badge>
                       <div className="text-xl font-black text-emerald-500 font-mono">{(sel.Prob * 100).toFixed(1)}%</div>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2 leading-tight">{sel.Match}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-6">{sel.League} | {sel.Heure}</p>
                    
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Market</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{sel.Marche}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Odds</span>
                        <div className="text-lg font-black font-mono">@{sel.Cote_Ref}</div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* VIEW: STRATEGIES */}
      {activeView === 'strategies' && (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="px-2">
            <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Assembled Strategies</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Algorithmic combinations grouped by risk profile and mathematical synergy.</p>
          </div>

          <div className="flex flex-col gap-16">
            {Object.entries(categories).sort().map(([cat, items]) => (
              <div key={cat} className="flex flex-col gap-8">
                <div className="flex items-center gap-4">
                   <div className="h-px flex-1 bg-slate-200 dark:border-slate-800"></div>
                   <span className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-black rounded-full uppercase tracking-[0.3em]">Category {cat}</span>
                   <div className="h-px flex-1 bg-slate-200 dark:border-slate-800"></div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {items.map(([key, ticket]) => (
                    <div key={key} className="flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl transition-all hover:shadow-emerald-500/5 group">
                      <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 relative">
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

                         <div className="grid grid-cols-3 gap-4 mb-2">
                            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Gain (10U)</span>
                              <span className="text-base font-black text-slate-900 dark:text-white font-mono">{ticket.metrics?.gain_10u || '0'}U</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Implic. Prob</span>
                              <span className="text-base font-black text-slate-900 dark:text-white font-mono">{(ticket.metrics?.prob_implicite ? (ticket.metrics.prob_implicite * 100).toFixed(2) : '0.00')}%</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Correlation</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">{ticket.metrics?.badge_name || 'N/A'}</span>
                                <span className="text-lg">{ticket.metrics?.badge_correlation || ''}</span>
                              </div>
                            </div>
                         </div>
                      </div>

                      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
                        {ticket.legs?.map((leg, lidx) => (
                          <TicketLeg key={lidx} leg={leg} onNavigate={onNavigateToMatch} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: ALL PICKS */}
      {activeView === 'picks' && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="px-2">
            <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Full Selection Database</h3>
            <p className="text-slate-500 text-sm font-medium mt-1">Individual picks validated by Titanium Engine with deep streak analysis.</p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search team or league..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
             </div>
             
             <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <Filter size={14} className="text-slate-400" />
                   <select 
                    value={filterTier}
                    onChange={e => setFilterTier(e.target.value)}
                    className="bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none"
                   >
                     <option value="ALL">All Tiers</option>
                     <option value="1">Tier 1</option>
                     <option value="2">Tier 2</option>
                     <option value="3">Tier 3+</option>
                   </select>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <TrendingUp size={14} className="text-slate-400" />
                   <select 
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none"
                   >
                     <option value="prob">Probability</option>
                     <option value="odds">Highest Odds</option>
                   </select>
                </div>
             </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
             {filteredPicks.map((sel, idx) => (
                <div 
                  key={idx}
                  onClick={() => onNavigateToMatch(sel.Match, LEAGUE_NAME_TO_CODE[sel.League] || 'ALL')}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={sel.Tier === 1 ? 'success' : 'info'} className="text-[8px] px-1.5 py-0">T{sel.Tier}</Badge>
                    <span className="text-[10px] font-black font-mono text-emerald-500">{(sel.Prob * 100).toFixed(0)}%</span>
                  </div>
                  
                  <div>
                    <h5 className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight line-clamp-1">{sel.Match}</h5>
                    <p className="text-[9px] text-slate-400 font-bold">{sel.League}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 dark:border-slate-800/50">
                     <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 truncate max-w-[100px]">{sel.Marche}</span>
                     <span className="text-[11px] font-black font-mono">@{sel.Cote_Ref}</span>
                  </div>
                </div>
             ))}
          </div>

          {filteredPicks.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-mono uppercase tracking-widest">No matching picks found</p>
            </div>
          )}
        </div>
      )}

      {/* Strategic Footer Context */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-10 shadow-inner mt-10">
        <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0 relative">
          <div className="absolute inset-0 bg-emerald-500/5 animate-ping rounded-[2.5rem]"></div>
          <Flame size={64} className="text-emerald-500 relative z-10" />
        </div>
        <div className="flex flex-col gap-4 text-center lg:text-left">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">ColdBetdrox Logic: Anti-Variance Shield</h4>
          <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Notre "Master Selection" n'est pas une simple liste de paris, c'est une architecture de gestion du risque. Chaque ticket assemblé utilise des corrélations négatives pour minimiser l'impact de la variance sur le long terme.
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start mt-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <ShieldCheck size={16} className="text-emerald-500" /> Situational Proof
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Target size={16} className="text-blue-500" /> Justice Calibration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
