import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Terminal, Activity, Layers, Menu, X, Command, PanelLeftClose, PanelLeftOpen, ShieldCheck, Zap, Target, Lock, LineChart, Flame, TrendingUp, Sun, Moon, Trophy, PieChart, AlertTriangle, Ticket, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { MatchList } from './components/MatchList';
import { MatchDashboard } from './components/MatchDashboard';
import TicketsView from './components/dashboard/TicketsView';
import { AdvancedFilterDrawer } from './components/filters/AdvancedFilterDrawer';
import { BatchDateBar } from './components/filters/BatchDateBar';
import { loadTitaniumV2Session, getLeagueReportUrl, cleanStr } from './utils/titaniumLoader';
import { LEAGUE_GROUPS, getLeagueGroupId } from './utils/ticketFilters';
import { LeagueLogo, getLeagueDisplayName, getLeagueCountryLabel } from './utils/teamLogos';
import {
  INITIAL_FILTERS_STATE,
  filterMatches,
  getNextFiltersState,
  computeWhatIfCount,
  countActiveFilters,
  getActiveFilterChips
} from './utils/filterPredicates';

const MASTER_HUB_LEAGUE = { id: 'TICKETS', name: 'Master Selections', code: 'TICKETS', flag: '🏆' };
const ALL_LEAGUES_DEFAULT = { id: 'ALL', name: 'Toutes les Ligues', code: 'ALL', flag: '🌍' };

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [availableLeagues, setAvailableLeagues] = useState([ALL_LEAGUES_DEFAULT]);
  const [selectedLeague, setSelectedLeague] = useState(ALL_LEAGUES_DEFAULT);
  const [selectedDate, setSelectedDate] = useState('ALL');
  const [sessionData, setSessionData] = useState(null);
  const [sessionMetadata, setSessionMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedMatchReport, setSelectedMatchReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [ticketsData, setTicketsData] = useState({ assembled: null, finals: null, loading: false });
  const [showWarningBanner, setShowWarningBanner] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [matchListOpen, setMatchListOpen] = useState(true);
  const [filtersState, setFiltersState] = useState(INITIAL_FILTERS_STATE);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const handleToggleFilter = (key, subKey = null) => {
    setFiltersState(prev => getNextFiltersState(prev, key, subKey));
  };

  const handleResetFilters = () => {
    setFiltersState(INITIAL_FILTERS_STATE);
  };
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState(() => ({}));
  const [isMatchListScrolled, setIsMatchListScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const isTransitioning = useRef(false);
  const activeMatchRequestRef = useRef(null);

  useEffect(() => {
    setIsMatchListScrolled(false);
  }, [selectedLeague, selectedDate]);

  useEffect(() => {
    const handleScroll = (e) => {
      const currentScrollY = e.target.scrollTop;
      const delta = currentScrollY - lastScrollY.current;

      if (Math.abs(delta) < 15) return;

      if (currentScrollY > lastScrollY.current) {
        // Scrolling Down
        if (headerVisible) setHeaderVisible(false);
      } else {
        // Scrolling Up
        if (!headerVisible) setHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
    }

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleViewportChange = (e) => {
      if (e.matches) {
        setSidebarOpen(false);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleViewportChange);
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleViewportChange);
      }
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Load TITANIUM V2 session once
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      setLoading(true);
      setError(null);
      try {
        const result = await loadTitaniumV2Session();
        if (!isMounted) return;
        setSessionData(result);
        setAvailableLeagues(result.leagues);
        setTicketsData(result.ticketsData);
        setSessionMetadata(result.sessionMetadata);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load TITANIUM V2 session:", err);
        setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedMatch(null);
      setSelectedMatchReport(null);
      activeMatchRequestRef.current = null;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectMatch = async (match) => {
    if (!match) return;
    setSelectedMatch(match);
    setSidebarOpen(false);

    // Fetch league report for Deep-Dive without in-place mutation
    const matchId = match.Match_ID || match.Matchup;
    activeMatchRequestRef.current = matchId;
    setSelectedMatchReport(null);
    setLoadingReport(true);

    if (match.League) {
      const reportUrl = getLeagueReportUrl(match.League);
      try {
        const res = await fetch(reportUrl);
        if (res.ok) {
          const report = await res.json();
          if (activeMatchRequestRef.current === matchId) {
            const matchDetails = report.filter(r => {
              if (r.Match_ID && match.Match_ID) {
                return r.Match_ID === match.Match_ID;
              }
              return cleanStr(r.Match) === cleanStr(match.Matchup);
            });
            setSelectedMatchReport(matchDetails);
          }
        }
      } catch (e) {
        console.error("Error fetching league report:", e);
      } finally {
        if (activeMatchRequestRef.current === matchId) {
          setLoadingReport(false);
        }
      }
    } else {
      setLoadingReport(false);
    }

    window.history.pushState({ matchSelected: true }, '');
  };

  const handleCloseMatch = () => {
    setSelectedMatch(null);
    setSelectedMatchReport(null);
    activeMatchRequestRef.current = null;
    if (window.history.state?.matchSelected) {
      window.history.back();
    }
  };

  const handleNavigateToMatch = (matchIdentifier, leagueIdentifier) => {
    if (!sessionData?.matches) return;
    const cleanId = cleanStr(matchIdentifier);
    const targetMatch = sessionData.matches.find(m =>
      (m.Match_ID && m.Match_ID === matchIdentifier) ||
      cleanStr(m.Matchup).includes(cleanId) ||
      cleanId.includes(cleanStr(m.Matchup))
    );

    if (targetMatch) {
      if (selectedLeague.id === 'TICKETS') {
        const targetLeague = availableLeagues.find(l =>
          l.code === targetMatch.League ||
          l.id === targetMatch.League.toUpperCase().replace(/\s+/g, '')
        ) || availableLeagues[0];
        setSelectedLeague(targetLeague);
      } else if (selectedLeague.id !== 'ALL' && selectedLeague.code !== targetMatch.League) {
        const targetLeague = availableLeagues.find(l =>
          l.code === targetMatch.League ||
          l.id === targetMatch.League.toUpperCase().replace(/\s+/g, '')
        ) || availableLeagues[0];
        setSelectedLeague(targetLeague);
      }
      handleSelectMatch(targetMatch);
      setMatchListOpen(true);
    }
  };

  const leagueMatches = useMemo(() => {
    if (!sessionData?.matches) return [];
    if (selectedLeague.id === 'TICKETS') return [];
    if (selectedLeague.id === 'ALL') return sessionData.matches;
    return sessionData.matches.filter(m =>
      m.League === selectedLeague.code ||
      m.League.toUpperCase().replace(/\s+/g, '') === selectedLeague.id
    );
  }, [sessionData, selectedLeague]);

  const leagueMatchCounts = useMemo(() => {
    const counts = {};
    if (!sessionData?.matches) return counts;
    for (const m of sessionData.matches) {
      if (m.League) {
        counts[m.League] = (counts[m.League] || 0) + 1;
      }
    }
    return counts;
  }, [sessionData]);

  const groupedLeagues = useMemo(() => {
    const specificLeagues = availableLeagues.filter(l => l.id !== 'ALL');
    const orderedGroupKeys = [
      'TOP_7_EUROPE',
      'SECOND_TIERS_EUROPE',
      'OTHER_EUROPE',
      'AMERICAS',
      'ASIA'
    ];

    const groupsMap = {};
    for (const key of orderedGroupKeys) {
      const def = LEAGUE_GROUPS[key] || { label: key, description: key };
      groupsMap[key] = {
        id: key,
        label: def.label,
        description: def.description,
        leagues: []
      };
    }
    const otherGroup = {
      id: 'AUTRES_LIGUES',
      label: 'Autres Ligues',
      description: 'Ligues complémentaires',
      leagues: []
    };

    for (const l of specificLeagues) {
      const gid = getLeagueGroupId(l.code || l.name);
      if (groupsMap[gid]) {
        groupsMap[gid].leagues.push(l);
      } else {
        otherGroup.leagues.push(l);
      }
    }

    const result = orderedGroupKeys
      .map(k => groupsMap[k])
      .filter(g => g.leagues.length > 0);

    if (otherGroup.leagues.length > 0) {
      result.push(otherGroup);
    }

    return result;
  }, [availableLeagues]);

  const availableDates = useMemo(() => {
    if (!leagueMatches || leagueMatches.length === 0) return [];
    return Array.from(new Set(leagueMatches.map(m => m.date || 'Date Inconnue'))).sort((a, b) => {
      if (a === 'Date Inconnue') return 1;
      if (b === 'Date Inconnue') return -1;
      return a.localeCompare(b);
    });
  }, [leagueMatches]);

  const dateCounts = useMemo(() => {
    const counts = {};
    (leagueMatches || []).forEach(m => {
      const d = m.date || 'Date Inconnue';
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [leagueMatches]);

  const baseMatches = useMemo(() => {
    return leagueMatches.filter(match => {
      const dateMatch = selectedDate === 'ALL' || match.date === selectedDate;
      if (!dateMatch) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (match.Matchup && match.Matchup.toLowerCase().includes(q)) ||
        (match.displayHome && match.displayHome.toLowerCase().includes(q)) ||
        (match.displayAway && match.displayAway.toLowerCase().includes(q)) ||
        (match.shortHome && match.shortHome.toLowerCase().includes(q)) ||
        (match.shortAway && match.shortAway.toLowerCase().includes(q))
      );
    });
  }, [leagueMatches, searchQuery, selectedDate]);

  const filteredMatches = useMemo(() => {
    return filterMatches(baseMatches, filtersState);
  }, [baseMatches, filtersState]);

  const masterWhatIf = useMemo(() => computeWhatIfCount(baseMatches, filtersState, 'masterPicksOnly'), [baseMatches, filtersState]);
  const ticketsWhatIf = useMemo(() => computeWhatIfCount(baseMatches, filtersState, 'inTicketsOnly'), [baseMatches, filtersState]);
  const superWhatIf = useMemo(() => computeWhatIfCount(baseMatches, filtersState, 'superSignalsAny'), [baseMatches, filtersState]);
  const killSwitchWhatIf = useMemo(() => computeWhatIfCount(baseMatches, filtersState, 'killSwitchActiveOnly'), [baseMatches, filtersState]);
  const activeFiltersCount = useMemo(() => countActiveFilters(filtersState), [filtersState]);
  const activeFilterChips = useMemo(() => getActiveFilterChips(filtersState), [filtersState]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Leagues Menu) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col
        transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${sidebarOpen
          ? 'translate-x-0 w-72 sm:w-80 lg:w-64 xl:w-72 border-r opacity-100'
          : '-translate-x-full lg:translate-x-0 w-72 lg:w-0 border-r lg:border-r-0 opacity-100 lg:opacity-0 lg:overflow-hidden'}
      `}>
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 shadow-inner shrink-0">
              <Terminal className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-wide truncate">ColdBetdrox Lab</h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase truncate">TITANIUM Terminal</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-2 shrink-0"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 px-2">Matrices Actives</div>
          <nav className="flex flex-col gap-1.5">
            {/* 1. All Leagues Root Entry */}
            {availableLeagues.find(l => l.id === 'ALL') && (
              <button
                key="ALL"
                onClick={() => {
                  setSelectedLeague(ALL_LEAGUES_DEFAULT);
                  setSelectedDate('ALL');
                  setMatchListOpen(true);
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`
                  flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all text-left mb-2
                  ${selectedLeague.id === 'ALL'
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">🌍</span>
                  <span className="truncate">Toutes les Ligues</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 shrink-0">
                  {sessionData?.matches?.length || 0}
                </span>
              </button>
            )}

            {/* 2. Categorized League Groups */}
            <div className="flex flex-col gap-2">
              {groupedLeagues.map(group => {
                const isSelectedInGroup = group.leagues.some(l => l.id === selectedLeague.id);
                const isCollapsed = Boolean(collapsedGroups[group.id]) && !isSelectedInGroup;
                const groupMatchCount = group.leagues.reduce((acc, l) => acc + (leagueMatchCounts[l.code] || 0), 0);

                return (
                  <div key={group.id} className="flex flex-col rounded-xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/40">
                    <button
                      type="button"
                      onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !isCollapsed }))}
                      className="flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors bg-slate-100/50 dark:bg-slate-800/30"
                      title={group.description}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="uppercase tracking-wider text-[10px] font-bold truncate pr-1">{group.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                          {groupMatchCount}
                        </span>
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="flex flex-col gap-1 p-1.5 pt-1">
                        {group.leagues.map(league => {
                          const mCount = leagueMatchCounts[league.code] || 0;
                          const displayName = getLeagueDisplayName(league.name || league.code);
                          const countryLabel = getLeagueCountryLabel(league.code || league.name);
                          return (
                            <button
                              key={league.id}
                              onClick={() => {
                                setSelectedLeague(league);
                                setSelectedDate('ALL');
                                setMatchListOpen(true);
                                if (window.innerWidth < 1024) {
                                  setSidebarOpen(false);
                                }
                              }}
                              title={countryLabel ? `${displayName} (${countryLabel})` : displayName}
                              className={`
                                flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left
                                ${selectedLeague.id === league.id
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30 shadow-2xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}
                              `}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                  <LeagueLogo league={league.code || league.name} size="sm" />
                                </div>
                                <div className="flex flex-col min-w-0 leading-tight">
                                  <span className="truncate">{displayName}</span>
                                  {countryLabel && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                                      {countryLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                                {mCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            SYSTÈME EN LIGNE
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">

        {/* Mobile Smart Floating Header (Fixed Overlay - Appears on Scroll Up) */}
        <div className={`
          lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 shadow-lg dark:shadow-[0_8px_24px_rgba(0,0,0,0.7)]
          transition-all duration-300 ease-out transform
          ${headerVisible && lastScrollY.current > 200 ? 'translate-y-0' : '-translate-y-full'}
        `}>
          <div className="h-16 flex items-center justify-between px-2.5 sm:px-4 gap-2">
             <div className="flex items-center gap-2 shrink-0">
                <button
                  className="text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Menu"
                >
                  <Menu size={18} />
                </button>
                <div className="hidden sm:flex flex-col">
                  <h1 className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">ColdBetdrox</h1>
                  <p className="text-[8px] text-emerald-500 font-mono tracking-widest uppercase">Live Matrix</p>
                </div>
             </div>

             <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {selectedLeague.id === 'TICKETS' && (
                  <button
                    onClick={() => {
                      setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                      setSidebarOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 transition-colors"
                  >
                    ← Matchs
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedLeague(MASTER_HUB_LEAGUE);
                    setSelectedMatch(null);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedLeague.id === 'TICKETS' ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                  aria-label="Master Hub"
                >
                  <Trophy size={14} className={selectedLeague.id === 'TICKETS' ? 'animate-bounce' : ''} />
                  <span>HUB</span>
                </button>
                {selectedLeague.id !== 'TICKETS' && (
                  <>
                    <BatchDateBar
                      availableDates={availableDates}
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                      dateCounts={dateCounts}
                      totalMatchesCount={leagueMatches.length}
                      isMobile={true}
                    />
                    <button
                      className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                      onClick={() => {
                        setMobileSearchOpen(true);
                        setHeaderVisible(true);
                      }}
                      aria-label="Recherche"
                    >
                      <Search size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={toggleTheme}
                  className="text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                  aria-label="Thème"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
             </div>
          </div>
        </div>

        {/* Static Header Section (Scrolls naturally) */}
        <header className="relative z-40 bg-white dark:bg-slate-900 transition-colors duration-300">
          {/* Desktop Header & Mobile Static Top Part */}
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="h-16 flex items-center justify-between px-2.5 sm:px-4 lg:px-6 gap-2 sm:gap-4">
              {mobileSearchOpen && selectedLeague.id !== 'TICKETS' ? (
                <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200 lg:hidden">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Chercher une équipe..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-emerald-500/50 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                    <button
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                      <Menu size={18} />
                    </button>
                    {selectedLeague.id !== 'TICKETS' && (
                      <button
                        className="hidden lg:flex text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                        onClick={() => setMatchListOpen(!matchListOpen)}
                      >
                        {matchListOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                      </button>
                    )}
                    <div className="hidden xl:flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Activity size={12} className="text-emerald-600 dark:text-emerald-500" />
                      <span>Engine <span className="text-emerald-600 dark:text-emerald-400 font-mono ml-1">ACTIVE</span></span>
                    </div>
                  </div>

                  {/* Desktop Integrated Navigation (Hidden on Mobile) */}
                  {selectedLeague.id === 'TICKETS' ? (
                    <div className="hidden lg:flex flex-1 items-center gap-3 min-w-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Trophy size={14} className="text-emerald-500" />
                        <span>MASTER HUB • TICKETS & SÉLECTIONS TITANIUM</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <span>← Retour à la Matrice ({sessionData?.matches?.length || 0} matchs)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="hidden lg:flex flex-1 items-center gap-3 min-w-0">
                      {/* Batch Date Navigation */}
                      <BatchDateBar
                        availableDates={availableDates}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        dateCounts={dateCounts}
                        totalMatchesCount={leagueMatches.length}
                      />

                      {/* Subtle divider separating temporal calendar from analytical risk filters */}
                      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-1 hidden xl:block" />

                      {/* Desktop Quick Bar */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar snap-x shrink-0">
                          {[
                            {
                              id: 'master',
                              label: filtersState.masterPicksOnly ? `MASTER (${filteredMatches.length})` : `MASTER (${masterWhatIf})`,
                              icon: <Trophy size={12} />,
                              active: filtersState.masterPicksOnly,
                              disabled: !filtersState.masterPicksOnly && masterWhatIf === 0,
                              toggle: () => handleToggleFilter('masterPicksOnly'),
                              activeClass: 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                            },
                            {
                              id: 'tickets',
                              label: filtersState.inTicketsOnly ? `IN TICKETS (${filteredMatches.length})` : `IN TICKETS (${ticketsWhatIf})`,
                              icon: <Ticket size={12} />,
                              active: filtersState.inTicketsOnly,
                              disabled: !filtersState.inTicketsOnly && ticketsWhatIf === 0,
                              toggle: () => handleToggleFilter('inTicketsOnly'),
                              activeClass: 'bg-blue-600 border-blue-500 text-white shadow-sm'
                            },
                            {
                              id: 'super',
                              label: filtersState.superSignalsAny ? `SUPER SIGNALS (${filteredMatches.length})` : `SUPER SIGNALS (${superWhatIf})`,
                              icon: <Zap size={12} />,
                              active: filtersState.superSignalsAny,
                              disabled: !filtersState.superSignalsAny && superWhatIf === 0,
                              toggle: () => handleToggleFilter('superSignalsAny'),
                              activeClass: 'bg-amber-600 border-amber-500 text-white shadow-sm'
                            },
                            {
                              id: 'kill',
                              label: filtersState.killSwitchActiveOnly ? `KILL-SWITCH (${filteredMatches.length})` : `KILL-SWITCH (${killSwitchWhatIf})`,
                              icon: <AlertTriangle size={12} />,
                              active: filtersState.killSwitchActiveOnly,
                              disabled: !filtersState.killSwitchActiveOnly && killSwitchWhatIf === 0,
                              toggle: () => handleToggleFilter('killSwitchActiveOnly'),
                              activeClass: 'bg-rose-600 border-rose-500 text-white shadow-sm'
                            },
                          ].map(sig => (
                            <button
                              key={sig.id}
                              onClick={sig.toggle}
                              disabled={sig.disabled}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] transition-all font-bold border shrink-0 snap-start ${
                                sig.disabled
                                  ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                                  : sig.active
                                    ? `${sig.activeClass} shadow-sm`
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              {sig.icon}
                              <span>{sig.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Fixed Button to open Advanced Drawer */}
                        <button
                          onClick={() => setIsFilterDrawerOpen(true)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] transition-all font-bold border shrink-0 ${
                            activeFiltersCount > 0
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="Ouvrir les dimensions analytiques"
                        >
                          <Filter size={12} />
                          <span>FILTRES</span>
                          {activeFiltersCount > 0 && (
                            <span className="px-1 py-0.2 rounded-full text-[8px] font-mono bg-emerald-500 text-white font-bold">
                              {activeFiltersCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-3 shrink-0 ml-auto">
                    {selectedLeague.id === 'TICKETS' && (
                      <button
                        onClick={() => {
                          setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                        }}
                        className="lg:hidden px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 transition-colors"
                      >
                        ← Matchs
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedLeague(MASTER_HUB_LEAGUE);
                        setSelectedMatch(null);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest lg:tracking-[0.2em] border transition-all ${selectedLeague.id === 'TICKETS' ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-500'}`}
                      aria-label="Master Hub"
                    >
                      <Trophy size={14} className={selectedLeague.id === 'TICKETS' ? 'animate-bounce' : ''} />
                      <span className="hidden lg:inline">{selectedLeague.id === 'TICKETS' ? 'HUB ACTIVE' : 'MASTER HUB'}</span>
                      <span className="lg:hidden">HUB</span>
                    </button>

                    {selectedLeague.id !== 'TICKETS' && (
                      <>
                        {/* Mobile BatchDateBar (hidden on desktop lg+) */}
                        <div className="lg:hidden">
                          <BatchDateBar
                            availableDates={availableDates}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            dateCounts={dateCounts}
                            totalMatchesCount={leagueMatches.length}
                            isMobile={true}
                          />
                        </div>

                        {/* Desktop Search input (hidden on mobile) */}
                        <div className="relative group w-full max-w-[140px] hidden lg:block">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                          />
                        </div>

                        {/* Mobile Search button (hidden on desktop lg+) */}
                        <button
                          className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                          onClick={() => setMobileSearchOpen(true)}
                          aria-label="Recherche"
                        >
                          <Search size={18} />
                        </button>
                      </>
                    )}

                    {/* Theme Toggle (Mobile and Desktop) */}
                    <button
                      onClick={toggleTheme}
                      className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                      aria-label="Thème"
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Active Filters Chips Bar (Desktop) */}
        {selectedLeague.id !== 'TICKETS' && activeFiltersCount > 0 && (
          <div className="hidden lg:flex items-center gap-2 px-6 py-2 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono shrink-0">
              Filtres actifs ({activeFiltersCount}) :
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeFilterChips.map(chip => (
                <button
                  key={chip.subKey ? `${chip.key}-${chip.subKey}` : chip.key}
                  onClick={() => handleToggleFilter(chip.key, chip.subKey)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-colors group"
                  title="Cliquer pour retirer ce filtre"
                >
                  <span>{chip.label}</span>
                  <X size={10} className="group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
            <button
              onClick={handleResetFilters}
              className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-rose-500 transition-colors shrink-0 underline underline-offset-2"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Session Warnings Banner */}
        {showWarningBanner && sessionMetadata && (sessionMetadata.warnings?.length > 0 || sessionMetadata.missingSources?.length > 0) && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-amber-500" />
              <span>Session Warning: {[...sessionMetadata.warnings, ...sessionMetadata.missingSources.map(s => `Missing: ${s}`)].join(' • ')}</span>
            </div>
            <button onClick={() => setShowWarningBanner(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Sticky Filters: Quick Bar stays at the top on Mobile when viewing match list, hidden when match dashboard or MASTER HUB is open */}
        <div className={`sticky top-0 z-40 lg:z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 py-1.5 shadow-sm dark:shadow-[0_6px_20px_rgba(0,0,0,0.65)] lg:hidden transition-colors duration-300 ${selectedMatch || selectedLeague.id === 'TICKETS' ? 'hidden' : 'block'}`}>
          {/* Mobile Quick Bar with Fixed FILTRES Button */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-4">
            {/* Scrollable Quick Filter Pills */}
            <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar snap-x pb-0.5">
              {[
                {
                  id: 'master',
                  label: filtersState.masterPicksOnly ? `MASTER (${filteredMatches.length})` : `MASTER (${masterWhatIf})`,
                  icon: <Trophy size={12} />,
                  active: filtersState.masterPicksOnly,
                  disabled: !filtersState.masterPicksOnly && masterWhatIf === 0,
                  toggle: () => handleToggleFilter('masterPicksOnly'),
                  activeClass: 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                },
                {
                  id: 'tickets',
                  label: filtersState.inTicketsOnly ? `IN TICKETS (${filteredMatches.length})` : `IN TICKETS (${ticketsWhatIf})`,
                  icon: <Ticket size={12} />,
                  active: filtersState.inTicketsOnly,
                  disabled: !filtersState.inTicketsOnly && ticketsWhatIf === 0,
                  toggle: () => handleToggleFilter('inTicketsOnly'),
                  activeClass: 'bg-blue-600 border-blue-500 text-white shadow-sm'
                },
                {
                  id: 'super',
                  label: filtersState.superSignalsAny ? `SUPER SIGNALS (${filteredMatches.length})` : `SUPER SIGNALS (${superWhatIf})`,
                  icon: <Zap size={12} />,
                  active: filtersState.superSignalsAny,
                  disabled: !filtersState.superSignalsAny && superWhatIf === 0,
                  toggle: () => handleToggleFilter('superSignalsAny'),
                  activeClass: 'bg-amber-600 border-amber-500 text-white shadow-sm'
                },
                {
                  id: 'kill',
                  label: filtersState.killSwitchActiveOnly ? `KILL-SWITCH (${filteredMatches.length})` : `KILL-SWITCH (${killSwitchWhatIf})`,
                  icon: <AlertTriangle size={12} />,
                  active: filtersState.killSwitchActiveOnly,
                  disabled: !filtersState.killSwitchActiveOnly && killSwitchWhatIf === 0,
                  toggle: () => handleToggleFilter('killSwitchActiveOnly'),
                  activeClass: 'bg-rose-600 border-rose-500 text-white shadow-sm'
                },
              ].map(sig => (
                <button
                  key={sig.id}
                  onClick={sig.toggle}
                  disabled={sig.disabled}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] transition-all font-bold border shrink-0 snap-start ${
                    sig.disabled
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                      : sig.active
                        ? `${sig.activeClass} shadow-sm`
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {sig.icon}
                  <span>{sig.label}</span>
                </button>
              ))}
            </div>

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            {/* Mobile Fixed Button to open Advanced Drawer */}
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] transition-all font-bold border shadow-sm ${
                activeFiltersCount > 0
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Filter size={12} />
              <span>FILTRES</span>
              {activeFiltersCount > 0 && (
                <span className="px-1 py-0.2 rounded-full text-[8px] font-mono bg-emerald-500 text-white font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Active Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 pt-1 snap-x">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono shrink-0 snap-start">
                Filtres ({activeFiltersCount}) :
              </span>
              {activeFilterChips.map(chip => (
                <button
                  key={chip.subKey ? `${chip.key}-${chip.subKey}` : chip.key}
                  onClick={() => handleToggleFilter(chip.key, chip.subKey)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 snap-start"
                >
                  <span>{chip.label}</span>
                  <X size={9} />
                </button>
              ))}
              <button
                onClick={handleResetFilters}
                className="text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-rose-500 transition-colors shrink-0 underline underline-offset-2 ml-1 snap-start"
              >
                Effacer
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Match List Area or Tickets View */}
          {selectedLeague.id === 'TICKETS' ? (
             <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:pt-3 lg:pb-10 lg:px-8 custom-scrollbar bg-slate-100/90 dark:bg-slate-950 transition-colors duration-300">
               <TicketsView
                 assembled={ticketsData.assembled}
                 finals={ticketsData.finals}
                 loading={ticketsData.loading}
                 onNavigateToMatch={handleNavigateToMatch}
               />
             </div>
          ) : (
            <>
              <div className={`
                border-r border-slate-200 dark:border-slate-800 flex-col bg-white/50 dark:bg-slate-950/50 transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full
                ${selectedMatch ? 'hidden lg:flex' : 'flex'}
                ${matchListOpen ? 'w-full lg:w-80 opacity-100' : 'w-full lg:w-0 lg:border-r-0 lg:opacity-0'}
              `}>
                <div className="w-full lg:w-80 flex flex-col h-full min-h-0">
                  {/* Bandeau informatif : Championnat + Compteur de matchs (masqué pendant le défilement sur mobile) */}
                  <div className={`
                    px-4 border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex justify-between items-center shrink-0 overflow-hidden
                    transition-all duration-200 ease-in-out
                    ${isMatchListScrolled
                      ? 'max-h-0 py-0 opacity-0 border-b-0 lg:max-h-20 lg:py-2.5 lg:opacity-100 lg:border-b'
                      : 'max-h-20 py-2.5 opacity-100 border-b'
                    }
                  `}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selectedLeague.id !== 'ALL' && selectedLeague.id !== 'TICKETS' && (
                        <LeagueLogo league={selectedLeague.code || selectedLeague.name} size="sm" className="shrink-0" />
                      )}
                      <div>
                        <h2 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-tight truncate">
                          {getLeagueDisplayName(selectedLeague.name || selectedLeague.code)}
                        </h2>
                        <p className="text-[9px] text-slate-500 font-mono tracking-tighter">
                          {filteredMatches.length} MATCHES FOUND
                        </p>
                      </div>
                    </div>
                    {sessionData && <div className="text-[9px] uppercase font-mono tracking-tighter text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Synchronized</div>}
                  </div>

                <div className="flex-1 flex flex-col min-h-0 relative">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] uppercase tracking-widest font-mono">Loading Matrix...</span>
                    </div>
                  ) : error ? (
                    <div className="p-4 border border-rose-500/30 bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex flex-col gap-2 shadow-inner m-4">
                      <span className="font-bold uppercase tracking-wider text-xs">System Error</span>
                      <span className="text-xs leading-relaxed opacity-90">{error}</span>
                    </div>
                  ) : (
                    <MatchList
                      matches={filteredMatches}
                      selectedMatch={selectedMatch}
                      onSelectMatch={handleSelectMatch}
                      isScrolled={isMatchListScrolled}
                      onScrollChange={setIsMatchListScrolled}
                    />
                  )}
                </div>
              </div>
              </div>

              {/* Match Dashboard Area */}
              <div className={`
                flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar transition-colors duration-300
                ${!selectedMatch ? 'hidden lg:flex' : 'flex'}
              `}>
                {selectedMatch ? (
                  <div className="p-4 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-8 w-full">
                    <MatchDashboard
                      match={selectedMatch}
                      leagueReport={selectedMatchReport}
                      sessionId={sessionMetadata?.sessionId}
                      onClose={handleCloseMatch}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-5 p-8 h-full">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent"></div>
                      <Activity size={32} className="text-slate-300 dark:text-slate-700 relative z-10" />
                    </div>
                    <div className="text-center max-w-xs">
                      <p className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-sm mb-2">Awaiting Selection</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed font-mono">Select a match from the matrix to load its risk management dashboard and true probabilities.</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Advanced Filters Drawer (Desktop slide-over & Mobile bottom sheet) */}
      <AdvancedFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filtersState={filtersState}
        onToggleFilter={handleToggleFilter}
        onResetFilters={handleResetFilters}
        baseMatches={baseMatches}
        filteredMatchesCount={filteredMatches.length}
        activeFiltersCount={activeFiltersCount}
      />
    </div>
  );
}
