import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Terminal, Activity, Layers, Menu, X, Command, PanelLeftClose, PanelLeftOpen, ShieldCheck, Zap, Target, Lock, LineChart, Flame, TrendingUp, Sun, Moon, Trophy, PieChart, AlertTriangle, Ticket, Filter, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { MatchList } from './components/MatchList';
import { MatchDashboard } from './components/MatchDashboard';
import TicketsView from './components/dashboard/TicketsView';
import { FavoritesView } from './components/favorites/FavoritesView';
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
import { useFavorites } from './context/FavoritesContext.jsx';
import { findExactMatch } from './utils/favoritesStorage.js';

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
  const {
    persistenceWarning,
    downloadFavoritesBackup,
    dismissPersistenceWarning,
    totalFavoritesCount,
    totalMatchesCount,
    totalTicketsCount
  } = useFavorites();
  const [currentMainView, setCurrentMainView] = useState('matrix'); // 'matrix' | 'hub' | 'favorites'

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

  // État et références pour la recherche repliable (Zone C)
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTriggerBtnRef = useRef(null);

  // État et références pour le menu déroulant Signaux (Zone D)
  const [isSignalsDropdownOpen, setIsSignalsDropdownOpen] = useState(false);
  const signalsDropdownRef = useRef(null);
  const signalsTriggerBtnRef = useRef(null);

  // Largeur de fenêtre dynamique pour adaptation fine de la disposition
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus automatique du champ de recherche à l'ouverture
  useEffect(() => {
    if (searchPopoverOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchPopoverOpen]);

  // Fermeture de la recherche au clic extérieur et touche Escape
  useEffect(() => {
    if (!searchPopoverOpen) return;
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchPopoverOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSearchPopoverOpen(false);
        searchTriggerBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchPopoverOpen]);

  // Fermeture du menu Signaux au clic extérieur et touche Escape
  useEffect(() => {
    if (!isSignalsDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (signalsDropdownRef.current && !signalsDropdownRef.current.contains(e.target)) {
        setIsSignalsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSignalsDropdownOpen(false);
        signalsTriggerBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSignalsDropdownOpen]);

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

    // Correspondance exacte et déterministe (WEB-FAVORITES-001 - Phase 5)
    let targetMatch = null;
    if (typeof matchIdentifier === 'object' && matchIdentifier !== null) {
      targetMatch = findExactMatch(
        sessionData.matches,
        matchIdentifier,
        matchIdentifier.League || matchIdentifier.league || leagueIdentifier,
        matchIdentifier.date
      );
    } else {
      targetMatch = findExactMatch(
        sessionData.matches,
        matchIdentifier,
        leagueIdentifier
      );
    }

    if (targetMatch) {
      if (currentMainView === 'favorites') {
        // Préserver le contexte favoris sans basculer vers matrix
      } else if (currentMainView === 'hub' || selectedLeague.id === 'TICKETS') {
        const targetLeague = availableLeagues.find(l =>
          l.code === targetMatch.League ||
          l.id === targetMatch.League.toUpperCase().replace(/\s+/g, '')
        ) || availableLeagues[0];
        setSelectedLeague(targetLeague);
        setCurrentMainView('matrix');
      } else if (currentMainView === 'matrix') {
        if (selectedLeague.id !== 'ALL' && selectedLeague.code !== targetMatch.League) {
          const targetLeague = availableLeagues.find(l =>
            l.code === targetMatch.League ||
            l.id === targetMatch.League.toUpperCase().replace(/\s+/g, '')
          ) || availableLeagues[0];
          setSelectedLeague(targetLeague);
        }
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

  // Mode compact pour les filtres rapides (« Signaux ») si l'espace est contraint ou si un panneau est ouvert
  const shouldUseCompactSignals = useMemo(() => {
    if (sidebarOpen || matchListOpen) return true;
    if (windowWidth < 1380) return true;
    return false;
  }, [sidebarOpen, matchListOpen, windowWidth]);

  // Définition unique et partagée des 4 filtres rapides analytiques (Classes 100% statiques)
  const quickSignalFilters = useMemo(() => [
    {
      id: 'master',
      key: 'masterPicksOnly',
      label: 'MASTER',
      longLabel: 'MASTER CHOIX FINAUX',
      count: filtersState.masterPicksOnly ? filteredMatches.length : masterWhatIf,
      icon: <Trophy size={12} />,
      dropdownIcon: <Trophy size={14} className="text-emerald-500" />,
      active: filtersState.masterPicksOnly,
      disabled: !filtersState.masterPicksOnly && masterWhatIf === 0,
      toggle: () => handleToggleFilter('masterPicksOnly'),
      activeDirectClass: 'bg-emerald-600 border-emerald-500 text-white shadow-xs',
      activeDropdownClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
    },
    {
      id: 'tickets',
      key: 'inTicketsOnly',
      label: 'IN TICKETS',
      longLabel: 'IN TICKETS ASSEMBLÉS',
      count: filtersState.inTicketsOnly ? filteredMatches.length : ticketsWhatIf,
      icon: <Ticket size={12} />,
      dropdownIcon: <Ticket size={14} className="text-blue-500" />,
      active: filtersState.inTicketsOnly,
      disabled: !filtersState.inTicketsOnly && ticketsWhatIf === 0,
      toggle: () => handleToggleFilter('inTicketsOnly'),
      activeDirectClass: 'bg-blue-600 border-blue-500 text-white shadow-xs',
      activeDropdownClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30'
    },
    {
      id: 'super',
      key: 'superSignalsAny',
      label: 'SUPER SIGNALS',
      longLabel: 'SUPER SIGNALS (V2)',
      count: filtersState.superSignalsAny ? filteredMatches.length : superWhatIf,
      icon: <Zap size={12} />,
      dropdownIcon: <Zap size={14} className="text-amber-500" />,
      active: filtersState.superSignalsAny,
      disabled: !filtersState.superSignalsAny && superWhatIf === 0,
      toggle: () => handleToggleFilter('superSignalsAny'),
      activeDirectClass: 'bg-amber-600 border-amber-500 text-white shadow-xs',
      activeDropdownClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30'
    },
    {
      id: 'kill',
      key: 'killSwitchActiveOnly',
      label: 'KILL-SWITCH',
      longLabel: 'KILL-SWITCH ACTIF',
      count: filtersState.killSwitchActiveOnly ? filteredMatches.length : killSwitchWhatIf,
      icon: <AlertTriangle size={12} />,
      dropdownIcon: <AlertTriangle size={14} className="text-rose-500" />,
      active: filtersState.killSwitchActiveOnly,
      disabled: !filtersState.killSwitchActiveOnly && killSwitchWhatIf === 0,
      toggle: () => handleToggleFilter('killSwitchActiveOnly'),
      activeDirectClass: 'bg-rose-600 border-rose-500 text-white shadow-xs',
      activeDropdownClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30'
    }
  ], [filtersState, filteredMatches.length, masterWhatIf, ticketsWhatIf, superWhatIf, killSwitchWhatIf]);

  const activeSignalsCount = useMemo(() => quickSignalFilters.filter(f => f.active).length, [quickSignalFilters]);

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
          {/* Navigation Espaces de travail */}
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Navigation</div>
          <nav className="flex flex-col gap-1.5 mb-4">
            {/* 1. Toutes les Ligues (Repositionné en tête de navigation) */}
            {availableLeagues.find(l => l.id === 'ALL') && (
              <button
                type="button"
                key="ALL"
                onClick={() => {
                  setCurrentMainView('matrix');
                  setSelectedLeague(ALL_LEAGUES_DEFAULT);
                  setSelectedDate('ALL');
                  setMatchListOpen(true);
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`
                  flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all text-left min-h-[44px]
                  ${currentMainView === 'matrix' && selectedLeague.id === 'ALL'
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

            {/* 2. Bouton encadré : Mes favoris (Zone A) */}
            <button
              type="button"
              onClick={() => {
                setCurrentMainView('favorites');
                setSelectedMatch(null);
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={`w-full min-h-[44px] flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border ${
                currentMainView === 'favorites'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-xs font-bold'
                  : 'bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              aria-label="Accéder à Mes favoris"
              title={`Mes favoris (${totalFavoritesCount} enregistrés)`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Star size={15} className={currentMainView === 'favorites' ? 'text-amber-500 fill-amber-500 shrink-0' : 'text-amber-500 shrink-0'} />
                <span className="truncate">Mes favoris</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                  currentMainView === 'favorites'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {totalFavoritesCount}
                </span>
              </div>
            </button>

            {/* 3. Bouton encadré : Master Hub (Zone A) */}
            <button
              type="button"
              onClick={() => {
                setCurrentMainView('hub');
                setSelectedLeague(MASTER_HUB_LEAGUE);
                setSelectedMatch(null);
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={`w-full min-h-[44px] flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border ${
                currentMainView === 'hub' || selectedLeague.id === 'TICKETS'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 shadow-xs font-bold'
                  : 'bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              aria-label="Accéder au Master Hub"
              title="Master Hub (Tickets & Sélections TITANIUM)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Trophy size={15} className="text-emerald-500 shrink-0" />
                <span className="truncate">Master Hub</span>
              </div>
            </button>
          </nav>

          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 px-2">Matrices Actives</div>
          <nav className="flex flex-col gap-1.5">
            {/* Categorized League Groups */}
            <div className="flex flex-col gap-2">
              {groupedLeagues.map(group => {
                const isSelectedInGroup = currentMainView === 'matrix' && group.leagues.some(l => l.id === selectedLeague.id);
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
                                setCurrentMainView('matrix');
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
                                ${currentMainView === 'matrix' && selectedLeague.id === league.id
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
                {(currentMainView !== 'matrix' || selectedLeague.id === 'TICKETS') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMainView('matrix');
                      if (selectedLeague.id === 'TICKETS') {
                        setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                      }
                      setSidebarOpen(false);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 transition-colors"
                  >
                    ← Matchs
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMainView('favorites');
                    setSelectedMatch(null);
                    setSidebarOpen(false);
                  }}
                  className={`min-h-[44px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    currentMainView === 'favorites'
                      ? 'bg-amber-500 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  aria-label="Mes favoris"
                >
                  <Star size={13} className={currentMainView === 'favorites' ? 'fill-white text-white' : 'text-amber-500'} />
                  <span>FAV</span>
                  <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                    currentMainView === 'favorites' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}>
                    {totalFavoritesCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMainView('hub');
                    setSelectedLeague(MASTER_HUB_LEAGUE);
                    setSelectedMatch(null);
                    setSidebarOpen(false);
                  }}
                  className={`min-h-[44px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    currentMainView === 'hub' || selectedLeague.id === 'TICKETS'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  aria-label="Master Hub"
                >
                  <Trophy size={14} className={selectedLeague.id === 'TICKETS' || currentMainView === 'hub' ? 'animate-bounce' : ''} />
                  <span>HUB</span>
                </button>
                {currentMainView === 'matrix' && selectedLeague.id !== 'TICKETS' && (
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
                      type="button"
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
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      aria-label="Basculer le menu"
                    >
                      <Menu size={18} />
                    </button>
                    {selectedLeague.id !== 'TICKETS' && (
                      <button
                        className="hidden lg:flex text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm min-w-[44px] min-h-[44px] items-center justify-center"
                        onClick={() => setMatchListOpen(!matchListOpen)}
                        aria-label="Basculer la liste des matchs"
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
                  {currentMainView === 'favorites' ? (
                    <div className="hidden lg:flex flex-1 items-center gap-3 min-w-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        <span>ESPACE PERSONNEL • MES FAVORIS ({totalFavoritesCount})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMainView('matrix');
                          if (selectedLeague.id === 'TICKETS') setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <span>← Retour à la Matrice ({sessionData?.matches?.length || 0} matchs)</span>
                      </button>
                    </div>
                  ) : selectedLeague.id === 'TICKETS' || currentMainView === 'hub' ? (
                    <div className="hidden lg:flex flex-1 items-center gap-3 min-w-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Trophy size={14} className="text-emerald-500" />
                        <span>MASTER HUB • TICKETS & SÉLECTIONS TITANIUM</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMainView('matrix');
                          setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <span>← Retour à la Matrice ({sessionData?.matches?.length || 0} matchs)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="hidden lg:flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
                      {/* BatchDateBar (Position Historique Préservée) */}
                      <BatchDateBar
                        availableDates={availableDates}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        dateCounts={dateCounts}
                        totalMatchesCount={leagueMatches.length}
                      />

                      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

                      {/* Filtres Rapides : Mode direct (4 boutons) ou Mode compact (« Signaux ») */}
                      {shouldUseCompactSignals ? (
                        <div className="relative" ref={signalsDropdownRef}>
                          <button
                            ref={signalsTriggerBtnRef}
                            type="button"
                            onClick={() => setIsSignalsDropdownOpen(prev => !prev)}
                            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              activeSignalsCount > 0
                                ? 'bg-purple-600 border-purple-500 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                            aria-expanded={isSignalsDropdownOpen}
                            aria-haspopup="true"
                            title="Filtres rapides sur les signaux analytiques TITANIUM"
                          >
                            <Zap size={14} className={activeSignalsCount > 0 ? 'text-white' : 'text-purple-500'} />
                            <span>Signaux</span>
                            {activeSignalsCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-white/25 text-white font-black">
                                {activeSignalsCount}
                              </span>
                            )}
                            <ChevronDown size={12} className={`transition-transform duration-150 ${isSignalsDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Popover Liste des 4 Signaux */}
                          {isSignalsDropdownOpen && (
                            <div role="menu" className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span>Signaux Moteur</span>
                                <span>{activeSignalsCount} actif{activeSignalsCount > 1 ? 's' : ''}</span>
                              </div>
                              {quickSignalFilters.map(sig => (
                                <button
                                  key={sig.id}
                                  type="button"
                                  role="menuitem"
                                  onClick={sig.toggle}
                                  disabled={sig.disabled}
                                  className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                                    sig.disabled
                                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                                      : sig.active
                                        ? sig.activeDropdownClass
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {sig.dropdownIcon}
                                    <span className="text-[11px] font-bold">{sig.longLabel}</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {sig.count}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {quickSignalFilters.map(sig => (
                            <button
                              key={sig.id}
                              type="button"
                              onClick={sig.toggle}
                              disabled={sig.disabled}
                              className={`min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all ${
                                sig.disabled
                                  ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                                  : sig.active
                                    ? sig.activeDirectClass
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              {sig.icon}
                              <span>{sig.label}</span>
                              <span className="text-[10px] font-mono opacity-80">({sig.count})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                    {(currentMainView !== 'matrix' || selectedLeague.id === 'TICKETS') && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMainView('matrix');
                          if (selectedLeague.id === 'TICKETS') {
                            setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                          }
                        }}
                        className="min-h-[44px] lg:hidden px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 transition-colors"
                      >
                        ← Matchs
                      </button>
                    )}

                    {/* 1. Bouton FILTRES (Adjacent à FAV et HUB) */}
                    {currentMainView === 'matrix' && selectedLeague.id !== 'TICKETS' && (
                      <button
                        type="button"
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          activeFiltersCount > 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                        title="Ouvrir les dimensions analytiques (Filtres avancés)"
                        aria-label="Filtres avancés"
                      >
                        <Filter size={14} className={activeFiltersCount > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'} />
                        <span className="hidden sm:inline">FILTRES</span>
                        {activeFiltersCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500 text-white font-black">
                            {activeFiltersCount}
                          </span>
                        )}
                      </button>
                    )}

                    {/* 2. Bouton MES FAVORIS */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMainView('favorites');
                        setSelectedMatch(null);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                        currentMainView === 'favorites'
                          ? 'bg-amber-500 border-amber-400 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400/50'
                      }`}
                      title={`Mes favoris (${totalFavoritesCount} enregistrés)`}
                      aria-label={`Mes favoris (${totalFavoritesCount})`}
                    >
                      <Star size={14} className={currentMainView === 'favorites' ? 'fill-white text-white' : 'text-amber-500 fill-amber-500'} />
                      <span className="hidden sm:inline">FAV</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                        currentMainView === 'favorites'
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      }`}>
                        {totalFavoritesCount}
                      </span>
                    </button>

                    {/* 3. Bouton MASTER HUB */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMainView('hub');
                        setSelectedLeague(MASTER_HUB_LEAGUE);
                        setSelectedMatch(null);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                        currentMainView === 'hub' || selectedLeague.id === 'TICKETS'
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/50'
                      }`}
                      title="Master Hub (Tickets & Sélections TITANIUM)"
                      aria-label="Master Hub"
                    >
                      <Trophy size={14} className={selectedLeague.id === 'TICKETS' || currentMainView === 'hub' ? 'text-white' : 'text-emerald-500'} />
                      <span className="hidden sm:inline">HUB</span>
                    </button>

                    {/* 4. Mobile BatchDateBar (affiché sur mobile quand non-tickets) */}
                    {currentMainView === 'matrix' && selectedLeague.id !== 'TICKETS' && (
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
                    )}

                    {/* 5. Recherche Repliable (Icône Loupe avec Popover Ancré) */}
                    {currentMainView === 'matrix' && selectedLeague.id !== 'TICKETS' && (
                      <div className="relative" ref={searchContainerRef}>
                        <button
                          ref={searchTriggerBtnRef}
                          type="button"
                          onClick={() => setSearchPopoverOpen(prev => !prev)}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-all relative ${
                            searchQuery.trim() !== '' || searchPopoverOpen
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                          aria-label="Rechercher une équipe"
                          aria-expanded={searchPopoverOpen}
                          title={searchQuery.trim() ? `Recherche active : "${searchQuery}"` : "Rechercher une équipe"}
                        >
                          <Search size={16} />
                          {searchQuery.trim() !== '' && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                          )}
                        </button>

                        {/* Popover ancré */}
                        {searchPopoverOpen && (
                          <div className="fixed left-3 right-3 top-[68px] max-w-[340px] mx-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 md:w-80 sm:max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="relative flex items-center">
                              <Search size={15} className="absolute left-3 text-slate-400 dark:text-slate-500" />
                              <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Chercher une équipe..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                  }}
                                  className="absolute right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  aria-label="Effacer la recherche"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 font-mono">
                              <span>Touche Esc pour fermer</span>
                              {searchQuery && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {filteredMatches.length} match{filteredMatches.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. Thème Toggle */}
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
                      aria-label="Changer de thème"
                    >
                      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Active Filters Chips Bar (Desktop) */}
        {selectedLeague.id !== 'TICKETS' && currentMainView === 'matrix' && activeFiltersCount > 0 && (
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

        {/* Storage Persistence Warning Banner */}
        {persistenceWarning && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 shrink-0 z-30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertTriangle size={14} className="shrink-0 text-rose-500" />
              <span className="truncate">
                Attention : Le stockage local est saturé ou inaccessible. Vos favoris risquent d'être perdus au rechargement.
              </span>
              <button
                type="button"
                onClick={() => downloadFavoritesBackup()}
                className="ml-2 px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 transition-colors shrink-0"
              >
                Sauvegarder JSON
              </button>
            </div>
            <button
              type="button"
              onClick={dismissPersistenceWarning}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
              aria-label="Fermer l'avertissement"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Sticky Filters: Quick Bar stays at the top on Mobile when viewing match list, hidden when match dashboard, MASTER HUB or MES FAVORIS is open */}
        <div className={`sticky top-0 z-40 lg:z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90 py-1.5 shadow-sm dark:shadow-[0_6px_20px_rgba(0,0,0,0.65)] lg:hidden transition-colors duration-300 ${selectedMatch || selectedLeague.id === 'TICKETS' || currentMainView !== 'matrix' ? 'hidden' : 'block'}`}>
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
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Filter size={12} className={activeFiltersCount > 0 ? 'text-slate-800 dark:text-slate-200' : ''} />
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
          {currentMainView === 'favorites' ? (
            <>
              {selectedMatch && (
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar transition-colors duration-300 p-4 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-8 w-full">
                  <MatchDashboard
                    match={selectedMatch}
                    leagueReport={selectedMatchReport}
                    sessionId={sessionMetadata?.sessionId}
                    onClose={handleCloseMatch}
                  />
                </div>
              )}
              <div className={selectedMatch ? 'hidden' : 'flex-1 flex flex-col min-h-0 h-full'}>
                <FavoritesView
                  currentMatches={sessionData?.matches || []}
                  currentTickets={ticketsData}
                  sessionMetadata={sessionMetadata}
                  onNavigateToMatch={(match) => handleNavigateToMatch(match)}
                  onNavigateToMatrix={() => {
                    setCurrentMainView('matrix');
                    if (selectedLeague.id === 'TICKETS') setSelectedLeague(availableLeagues[0] || ALL_LEAGUES_DEFAULT);
                  }}
                  onNavigateToHub={() => {
                    setCurrentMainView('hub');
                    setSelectedLeague(MASTER_HUB_LEAGUE);
                  }}
                />
              </div>
            </>
          ) : currentMainView === 'hub' || selectedLeague.id === 'TICKETS' ? (
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
