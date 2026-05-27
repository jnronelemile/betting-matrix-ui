import React, { useState, useMemo } from 'react';
import { getTeamInfo } from '../../utils';
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
  MousePointer2,
  Activity,
  ShieldAlert,
  BarChart,
  Layers,
  Globe,
  Database,
  Code,
  Box,
  Fingerprint
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

const STRATEGY_CAT_MAPPING = {
  'A': { label: 'Alpha', desc: 'Elite', color: 'bg-emerald-500' },
  'B': { label: 'System', desc: 'Accas', color: 'bg-blue-500' },
  'C': { label: 'Props', desc: 'Situational', color: 'bg-purple-500' },
  'D': { label: 'Pool', desc: 'Global Mix', color: 'bg-amber-500' },
  'E': { label: 'Misc', desc: 'Specials', color: 'bg-rose-500' }
};

const TicketLeg = ({ leg, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const leagueCode = LEAGUE_NAME_TO_CODE[leg.League] || 'ALL';
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col group/leg hover:border-emerald-500/30 transition-all shadow-sm overflow-hidden">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-lg group-hover/leg:scale-110 transition-transform shrink-0">{leg.confidence_badge || '🎯'}</div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight truncate">{leg.Match}</span>
              {leg.Alpha && <span className="text-[7px] px-1 bg-amber-500 text-white font-black rounded shrink-0">ALPHA</span>}
            </div>
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              <span className="truncate">{leg.League}</span>
              <span className="text-emerald-500/70 shrink-0">Click to {expanded ? 'close' : 'view'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{leg.Marche}</span>
            <span className="text-[10px] font-black font-mono text-slate-400 dark:text-slate-500">@{leg.Cote_Ref || '0.00'}</span>
          </div>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>
      
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
               <Badge className="bg-slate-900 dark:bg-white text-white dark:text-black text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase">{leg.confidence_category || 'STANDARD'}</Badge>
               <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase">{leg.Type}</Badge>
            </div>

            {leg.Streak_Reason && (
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                {leg.Streak_Reason}
              </p>
            )}

            {leg.Live_Betting_Recommendation?.[0] && (
               <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                     <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Zap size={10} className="fill-rose-500" /> Live Signal
                     </span>
                     <span className="text-[8px] font-black font-mono text-rose-500">{ (leg.Live_Betting_Recommendation[0].Force * 100).toFixed(0) }%</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{leg.Live_Betting_Recommendation[0].Signal}</p>
                  <p className="text-[8px] font-medium text-slate-500 dark:text-slate-400 italic">{leg.Live_Betting_Recommendation[0].Argument}</p>
               </div>
            )}

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(leg.Match, leagueCode);
              }}
              className="w-full py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              Matrix <ArrowUpRight size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TicketsView({ assembled, finals, loading, onNavigateToMatch }) {
  const [activeView, setActiveView] = useState('summary'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterLeague, setFilterLeague] = useState('ALL');
  const [filterMarket, setFilterMarket] = useState('ALL');
  const [filterFamily, setFilterFamily] = useState('ALL');
  const [sortBy, setSortBy] = useState('prob'); 
  const [auditMode, setAuditMode] = useState(false);

  const [filterStratCat, setFilterStratCat] = useState('ALL');
  const [stratSortBy, setStratSortBy] = useState('reliability'); 

  const tickets = useMemo(() => assembled ? Object.entries(assembled) : [], [assembled]);
  
  const filteredStrategies = useMemo(() => {
    if (!assembled) return [];
    const flattened = [];
    Object.entries(assembled).forEach(([key, t]) => {
      if (t.variantes && Array.isArray(t.variantes)) {
        t.variantes.forEach((variant, vIdx) => {
          flattened.push([`${key}_v${vIdx}`, { ...t, nom: `${t.nom} #${vIdx + 1}`, legs: variant.legs, metrics: variant.metrics, isVariant: true }]);
        });
      } else {
        flattened.push([key, t]);
      }
    });
    return flattened.filter(([key, t]) => {
      const matchesCat = filterStratCat === 'ALL' || t.categorie === filterStratCat;
      const matchesSearch = t.nom?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }).sort((a, b) => {
      const stratA = a[1]; const stratB = b[1];
      if (stratSortBy === 'reliability') return (stratB.metrics?.fiabilite_moyenne || 0) - (stratA.metrics?.fiabilite_moyenne || 0);
      if (stratSortBy === 'odds') return (stratB.metrics?.cote_totale || 0) - (stratA.metrics?.cote_totale || 0);
      if (stratSortBy === 'gain') return (stratB.metrics?.gain_10u || 0) - (stratA.metrics?.gain_10u || 0);
      return 0;
    });
  }, [assembled, filterStratCat, stratSortBy, searchQuery]);

  const uniqueLeagues = useMemo(() => {
    if (!finals?.Selections) return [];
    return Array.from(new Set(finals.Selections.map(s => s.League).filter(Boolean))).sort();
  }, [finals]);

  const uniqueFamilies = useMemo(() => {
    if (!finals?.Selections) return [];
    const names = finals.Selections.map(s => s.family_name || s.Type).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [finals]);

  const uniqueMarkets = useMemo(() => {
    if (!finals?.Selections) return [];
    const baseMarkets = finals.Selections.map(s => {
      const m = s.Marche || '';
      if (m.includes('Over')) return 'Over Goals';
      if (m.includes('Under')) return 'Under Goals';
      if (m.includes('BTTS')) return 'BTTS';
      return 'Others';
    });
    return Array.from(new Set(baseMarkets)).sort();
  }, [finals]);

  const totalSelections = finals?.Selections?.length || 0;
  
  const avgProb = useMemo(() => {
    if (totalSelections === 0) return 0;
    const sum = finals.Selections.reduce((acc, s) => acc + (s.Prob || 0), 0);
    return (sum / totalSelections * 100).toFixed(1);
  }, [finals, totalSelections]);

  const avgOdds = useMemo(() => {
    if (totalSelections === 0) return 0;
    const sum = finals.Selections.reduce((acc, s) => acc + (s.Cote_Ref || 0), 0);
    return (sum / totalSelections).toFixed(2);
  }, [finals, totalSelections]);

  const profileStats = useMemo(() => {
    const stats = {};
    finals?.Selections?.forEach(s => {
      s.Profile?.forEach(p => { stats[p] = (stats[p] || 0) + 1; });
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [finals]);

  const filteredPicks = useMemo(() => {
    if (!finals?.Selections) return [];
    return finals.Selections.filter(p => {
      if (!p) return false;
      const familyRef = p.family_name || p.Type || '';
      const matchSearch = (p.Match || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.League || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.Streak_Reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          familyRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.Profile && p.Profile.some(prof => prof.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesTier = filterTier === 'ALL' || p.Tier === parseInt(filterTier);
      const matchesLeague = filterLeague === 'ALL' || p.League === filterLeague;
      const matchesFamily = filterFamily === 'ALL' || familyRef === filterFamily;
      let matchesMarket = true;
      if (filterMarket !== 'ALL') {
        const m = p.Marche || '';
        if (filterMarket === 'Over Goals') matchesMarket = m.includes('Over');
        else if (filterMarket === 'Under Goals') matchesMarket = m.includes('Under');
        else if (filterMarket === 'BTTS') matchesMarket = m.includes('BTTS');
        else matchesMarket = !m.includes('Over') && !m.includes('Under') && !m.includes('BTTS');
      }
      return matchSearch && matchesTier && matchesLeague && matchesFamily && matchesMarket;
    }).sort((a, b) => {
      if (sortBy === 'prob') return (b.Prob || 0) - (a.Prob || 0);
      if (sortBy === 'odds') return (b.Cote_Ref || 0) - (a.Cote_Ref || 0);
      if (sortBy === 'ev') return (b.Score_EV || 0) - (a.Score_EV || 0);
      return 0;
    });
  }, [finals, searchQuery, filterTier, filterLeague, filterMarket, filterFamily, sortBy]);

  const getTierColor = (tier) => {
    if (tier === 1) return 'bg-emerald-600 text-white';
    if (tier === 2) return 'bg-blue-600 text-white';
    return 'bg-slate-600 text-white';
  };

  const getProfileColor = (p) => {
    const colors = {
      'FORCE_DOMINANTE_AWAY': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'FORCE_DOMINANTE_HOME': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      'BUTS_GARANTIS': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      'FAUX_FAVORI': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      'MATCH_DE_PEUR': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      'SURVALUATION_MARCHE': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'MATCH_FERME': 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    };
    return colors[p] || 'bg-slate-100 text-slate-500 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-mono uppercase tracking-widest">Compiling Selections...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-32">
      
      {/* 1. INTERNAL NAVIGATION MENU */}
      <div className="sticky top-0 z-40 -mx-4 px-4 lg:mx-0 lg:px-0 py-3 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md border-b lg:border-none border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 overflow-hidden">
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'summary', label: 'Overview', icon: <BarChart3 size={14} /> },
            { id: 'strategies', label: 'Strategies', icon: <PieChart size={14} /> },
            { id: 'picks', label: 'Database', icon: <Layers size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all shrink-0
                ${activeView === tab.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={() => setAuditMode(!auditMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all shrink-0 ${auditMode ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}
        >
          <Code size={12} /> <span className="hidden xs:inline">Audit: {auditMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* VIEW: SUMMARY */}
      {activeView === 'summary' && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="relative rounded-[2rem] p-6 lg:p-10 overflow-hidden bg-slate-900 dark:bg-black border border-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none"><Trophy size={150} /></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                   <Trophy size={20} className="text-emerald-400" />
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Master Hub</span>
                </div>
                <h2 className="text-3xl lg:text-5xl font-serif font-black text-white tracking-tighter leading-none">Titanium <span className="text-emerald-400">Master</span></h2>
                <p className="text-slate-400 max-w-md text-xs lg:text-sm leading-relaxed font-medium italic opacity-80">{finals?.Methode || "V8.5 Calibrated"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Selections</span>
                  <span className="text-2xl font-black text-white font-mono">{totalSelections}</span>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Avg Prob</span>
                  <span className="text-2xl font-black text-white font-mono">{avgProb}%</span>
                </div>
                <div className="col-span-full bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-emerald-500/20 transition-all" onClick={() => setActiveView('strategies')}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-emerald-400" />
                    <span className="text-sm font-bold text-white uppercase tracking-widest">{tickets.length} Active Strategies</span>
                  </div>
                  <ArrowUpRight size={18} className="text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                {/* Profile Breakdown */}
                <div className="col-span-full bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Strategic Distribution</span>
                      <span className="text-[8px] font-bold text-emerald-500 uppercase flex items-center gap-1"><Database size={10} /> Live Feed</span>
                   </div>
                   <div className="flex flex-wrap gap-1.5">
                      {profileStats.map(([p, count]) => (
                        <div key={p} className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-tight flex items-center gap-1.5 ${getProfileColor(p)} shadow-sm`}>
                          {p.replace(/_/g, ' ')}
                          <span className="bg-white/20 px-1 rounded-md">{count}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
          {/* Alpha Picks */}
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap size={18} className="text-amber-500 fill-amber-500" /> Alpha Picks
                </h3>
                <button onClick={() => setActiveView('picks')} className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:underline">View All</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finals?.Selections ? finals.Selections.filter(s => s.Tier === 1).slice(0, 3).map((sel, idx) => (
                   <div key={idx} className="bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-xl group relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                       <Badge variant="success" className="bg-emerald-500 text-white text-[8px] px-2 py-0.5 shadow-md">ELITE T1</Badge>
                       <div className="text-lg font-black text-emerald-500 font-mono">{((sel.Prob || 0) * 100).toFixed(0)}%</div>
                    </div>
                    {(() => {
                      const parts = sel.Match.split(' vs ');
                      const homeTeam = parts[0] || 'Home';
                      const awayTeam = parts[1] || 'Away';
                      const homeInfo = getTeamInfo(homeTeam);
                      const awayInfo = getTeamInfo(awayTeam);
                      return (
                        <div className="flex items-center gap-2 mb-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate text-right">{homeInfo.shortName}</span>
                            <div className="w-5 h-5 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-sm border border-slate-200 dark:border-slate-700">
                              <img src={homeInfo.logoPath} alt={homeInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.webp'; }} />
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">VS</span>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                            <div className="w-5 h-5 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-sm border border-slate-200 dark:border-slate-700">
                              <img src={awayInfo.logoPath} alt={awayInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.webp'; }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate text-left">{awayInfo.shortName}</span>
                          </div>
                        </div>
                      );
                    })()}
                    <p className="text-[8px] text-slate-400 uppercase font-black mb-4">{sel.League} | {sel.Heure}</p>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                       <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 truncate max-w-[100px]">{sel.Marche}</span>
                       <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">@{sel.Cote_Ref}</span>
                       </div>
                    </div>
                    {sel.Live_Betting_Recommendation?.[0] && (
                       <div className="mb-4 bg-rose-500/5 border border-rose-500/10 rounded-xl p-2 flex items-center gap-2">
                          <Zap size={10} className="text-rose-500 fill-rose-500" />
                          <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">{sel.Live_Betting_Recommendation[0].Signal}</span>
                       </div>
                    )}
                    <button onClick={() => onNavigateToMatch(sel.Match, LEAGUE_NAME_TO_CODE[sel.League] || 'ALL')} className="mt-auto w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                      Analyze <ArrowUpRight size={12} />
                    </button>
                  </div>
                )) : <div className="col-span-full py-10 text-center text-slate-400 font-mono text-[10px] uppercase bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">No Alpha Picks Active</div>}
             </div>
          </div>
        </div>
      )}

      {/* VIEW: STRATEGIES */}
      {activeView === 'strategies' && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="px-1">
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Active Combinations</h3>
            <p className="text-slate-500 text-[10px] font-medium mt-0.5">Strategies optimized for long-term mathematical edge.</p>
          </div>
          <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-lg">
             <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Filter name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl py-2 pl-10 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
             </div>
             <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                   <Filter size={12} className="text-slate-400 shrink-0" /><select value={filterStratCat} onChange={e => setFilterStratCat(e.target.value)} className="bg-transparent text-[9px] font-black uppercase tracking-tight focus:outline-none w-full"><option value="ALL">All Types</option>{Object.entries(STRATEGY_CAT_MAPPING).map(([id, data]) => (<option key={id} value={id}>{data.label}</option>))}</select>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                   <TrendingUp size={12} className="text-slate-400 shrink-0" /><select value={stratSortBy} onChange={e => setStratSortBy(e.target.value)} className="bg-transparent text-[9px] font-black uppercase tracking-tight focus:outline-none w-full"><option value="reliability">Reliability</option><option value="odds">Highest Odds</option><option value="gain">Pot. Gain</option></select>
                </div>
             </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredStrategies.map(([key, ticket]) => (
              <div key={key} className="flex flex-col bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-xl transition-all hover:shadow-emerald-500/30 group active:scale-[0.99] border-t-2 border-t-emerald-500/20 relative">
                {auditMode && (<div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300"><pre className="text-[8px] font-mono text-emerald-400 whitespace-pre-wrap">{JSON.stringify(ticket, null, 2)}</pre></div>)}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
                   <div className="flex items-start justify-between mb-4 gap-4">
                     <div className="flex flex-col gap-1.5 min-w-0">
                       <div className="flex items-center gap-2">
                         <span className={`px-2 py-0.5 ${STRATEGY_CAT_MAPPING[ticket.categorie]?.color || 'bg-slate-900'} text-white text-[8px] font-black rounded shadow-sm shrink-0`}>{STRATEGY_CAT_MAPPING[ticket.categorie]?.label || `CAT ${ticket.categorie}`}</span>
                         <h3 className="text-base font-black text-slate-900 dark:text-white uppercase leading-none truncate">{ticket.nom}</h3>
                       </div>
                       <div className="flex flex-wrap items-center gap-3 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Box size={10} className="text-emerald-500" />{ticket.metrics?.nb_legs || ticket.size || 0} SELECTIONS</span>
                          <span className="flex items-center gap-1"><Activity size={10} className="text-blue-500" />{ticket.metrics?.fiabilite_moyenne || '0'}% RELIABILITY</span>
                       </div>
                     </div>
                     <div className="flex flex-col items-end shrink-0">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Est. Odds</span>
                        <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-500 tracking-tighter">@{ticket.metrics?.cote_totale?.toFixed(2) || '0.00'}</span>
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                        <span className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Gain 10U</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{ticket.metrics?.gain_10u || '0'}U</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                        <span className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Imp. Prob</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{(ticket.metrics?.prob_implicite ? (ticket.metrics.prob_implicite * 100).toFixed(0) : '0')}%</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex flex-col items-center ${ticket.metrics?.badge_correlation === '🟢' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                        <span className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Shield</span>
                        <span className="text-[8px] font-black text-slate-900 dark:text-white truncate">{ticket.metrics?.badge_name?.replace('Anti-Variance', 'AV-SHIELD') || 'N/A'} {ticket.metrics?.badge_correlation || ''}</span>
                      </div>
                   </div>
                </div>
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col gap-2">
                  {ticket.legs?.map((leg, lidx) => (<TicketLeg key={lidx} leg={leg} onNavigate={onNavigateToMatch} />))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: MASTER DATABASE */}
      {activeView === 'picks' && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="px-1 flex items-center justify-between gap-4">
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Master Database</h3>
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
               <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Avg EV:</span>
               <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">{(filteredPicks.reduce((acc, s) => acc + (s.Score_EV || 0), 0) / (filteredPicks.length || 1)).toFixed(3)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-lg">
             <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search team, profile..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl py-2 pl-10 pr-3 text-xs font-medium" />
             </div>
             <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                <div className="bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800"><select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="bg-transparent text-[8px] font-black uppercase w-full focus:outline-none"><option value="ALL">All Tiers</option><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="5">Tier 5</option></select></div>
                <div className="bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800"><select value={filterLeague} onChange={e => setFilterLeague(e.target.value)} className="bg-transparent text-[8px] font-black uppercase w-full focus:outline-none"><option value="ALL">All Leagues</option>{uniqueLeagues.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div className="bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800"><select value={filterFamily} onChange={e => setFilterFamily(e.target.value)} className="bg-transparent text-[8px] font-black uppercase w-full focus:outline-none"><option value="ALL">All Families</option>{uniqueFamilies.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                <div className="bg-slate-50 dark:bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800"><select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent text-[8px] font-black uppercase w-full focus:outline-none"><option value="prob">By Prob</option><option value="odds">By Odds</option><option value="ev">By EV</option></select></div>
             </div>
          </div>
          <div className="flex flex-col gap-3">
             {filteredPicks.map((sel, idx) => {
                    const isExpanded = expandedTicket === idx;
                    const parts = sel.Match.split(' vs ');
                    const homeTeam = parts[0] || 'Home';
                    const awayTeam = parts[1] || 'Away';
                    const homeInfo = getTeamInfo(homeTeam);
                    const awayInfo = getTeamInfo(awayTeam);

                    return (
                    <div key={idx} className="flex flex-col bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all duration-300 hover:border-emerald-500/40 group">
                      {auditMode && (<div className="absolute inset-0 z-50 bg-slate-900/95 p-4 overflow-y-auto"><pre className="text-[8px] font-mono text-emerald-400 whitespace-pre-wrap">{JSON.stringify(sel, null, 2)}</pre></div>)}

                      {/* Always Visible Primary Info */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors" onClick={() => toggleExpanded(idx)}>

                        {/* Teams Info */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <Badge className={`${getTierColor(sel.Tier)} text-[7px] px-1.5 py-0.5 rounded-md`}>T{sel.Tier}</Badge>
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${sel.Streak_Status === 'STREAK_CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{sel.Streak_Status?.replace('STREAK_', '')}</span>
                                {sel.Alpha && <span className="text-[7px] px-1.5 bg-amber-500 text-white font-black rounded">ALPHA</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                                    <img src={homeInfo.logoPath} alt={homeInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.webp'; }} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{homeInfo.shortName}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">VS</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                                    <img src={awayInfo.logoPath} alt={awayInfo.shortName} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = '/logos/default.webp'; }} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{awayInfo.shortName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Core Market Info */}
                        <div className="flex items-center gap-4 sm:min-w-[300px] justify-between">
                            <div className="flex flex-col flex-1 min-w-0 pr-4 border-r border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 truncate w-full" title={sel.Marche}>{sel.Marche}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400">{sel.League} | {sel.Heure || 'TBD'}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-emerald-500">{(sel.Prob*100).toFixed(0)}%</span>
                                  <span className="text-[9px] font-mono font-bold text-slate-400">@{sel.Cote_Ref}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform duration-300">
                                  <ChevronDown size={16} className={`transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </div>

                      </div>

                      {/* Collapsible Secondary Info */}
                      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">

                            {/* Detailed Profiles */}
                            {sel.Profile?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-4 mb-3">
                                    {sel.Profile.map(p => (
                                        <span key={p} className="text-[7px] font-mono text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                            {p.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                    <span className="text-[8px] text-slate-400 font-mono uppercase mb-1">Score EV</span>
                                    <span className="text-xs font-bold text-emerald-500">{sel.Score_EV?.toFixed(2)}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                    <span className="text-[8px] text-slate-400 font-mono uppercase mb-1">Family</span>
                                    <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase truncate w-full text-center">{sel.family_name || sel.Type}</span>
                                </div>
                                {sel.Super_Signal && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 flex flex-col items-center justify-center sm:col-span-2">
                                        <span className="text-[8px] text-amber-500 font-mono uppercase flex items-center gap-1 mb-1"><Zap size={10} /> Super Signal</span>
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">ACTIVE</span>
                                    </div>
                                )}
                            </div>

                            {sel.Streak_Reason && (
                                <div className="mb-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={12}/> Reason</h4>
                                    <p className="text-[10px] text-slate-700 dark:text-slate-300 font-mono">{sel.Streak_Reason}</p>
                                </div>
                            )}

                            {sel.Live_Betting_Recommendation?.[0] && (
                                <div className="mb-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 p-3 rounded-xl flex items-start gap-2">
                                    <Clock size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Live Recommendation</span>
                                        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {sel.Live_Betting_Recommendation[0].Signal} - {sel.Live_Betting_Recommendation[0].Argument}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end mt-4">
                                <button onClick={(e) => { e.stopPropagation(); onNavigateToMatch(sel.Match, LEAGUE_NAME_TO_CODE[sel.League] || 'ALL'); }} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-md">
                                    Deep Dive Analysis <ArrowUpRight size={14} />
                                </button>
                            </div>
                        </div>
                      </div>
                    </div>
                  );
             })}
          </div>
        </div>
      )}

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-inner mt-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 relative"><Flame size={32} className="text-emerald-500" /></div>
        <div className="flex flex-col gap-2 text-center sm:text-left"><h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">ColdBetdrox Anti-Variance</h4><p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-lg">Gestion du risque algorithmique via corrélations négatives.</p></div>
      </div>
    </div>
  );
}
