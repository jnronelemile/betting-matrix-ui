import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Terminal, Activity, Layers, Menu, X, Command, PanelLeftClose, PanelLeftOpen, ShieldCheck, Zap, Target, Lock, LineChart, Flame, TrendingUp, Sun, Moon, Trophy, PieChart, AlertTriangle } from 'lucide-react';
import { MatchList } from './components/MatchList';
import { MatchDashboard } from './components/MatchDashboard';
import TicketsView from './components/dashboard/TicketsView';
import { loadTitaniumV2Session, getLeagueReportUrl, cleanStr } from './utils/titaniumLoader';

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
  const [showTrueFavorites, setShowTrueFavorites] = useState(false);
  const [showSuperSignals, setShowSuperSignals] = useState(false);
  const [showHighConfidence, setShowHighConfidence] = useState(false);
  const [showUltraSafe, setShowUltraSafe] = useState(false);
  const [showRegularity, setShowRegularity] = useState(false);
  const [showSafeButs, setShowSafeButs] = useState(false);
  const [showTopForm, setShowTopForm] = useState(false);
  const [showMasterPicks, setShowMasterPicks] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const isTransitioning = useRef(false);
  const activeMatchRequestRef = useRef(null);

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
    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
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

  const availableDates = useMemo(() => {
    if (!leagueMatches || leagueMatches.length === 0) return [];
    return Array.from(new Set(leagueMatches.map(m => m.date || 'Date Inconnue'))).sort((a, b) => {
      if (a === 'Date Inconnue') return 1;
      if (b === 'Date Inconnue') return -1;
      return a.localeCompare(b);
    });
  }, [leagueMatches]);

  const filteredMatches = useMemo(() => {
    return leagueMatches.filter(match => {
      const textMatch = match.Matchup.toLowerCase().includes(searchQuery.toLowerCase());
      const dateMatch = selectedDate === 'ALL' || match.date === selectedDate;
      const isFalseFav = match.Risk_Management_Context?.Tactical_Red_Flags?.IS_FALSE_FAVORITE;
      const favMatch = !showTrueFavorites || isFalseFav === false;

      const hasSuperSignal = match.Super_Signals && Object.values(match.Super_Signals).some(v => v === true);
      const signalMatch = !showSuperSignals || hasSuperSignal;

      const confidence = match.Calibration_Diagnostics?.confidence_index || 0;
      const confidenceMatch = !showHighConfidence || confidence >= 0.65;

      const investSignals = match.Risk_Management_Context?.Investment_Signals || {};
      const ultraSafeMatch = !showUltraSafe || investSignals.IS_ULTRA_SAFE;

      const trajH = match.Calibration_Diagnostics?.trajectory_home || 1;
      const trajA = match.Calibration_Diagnostics?.trajectory_away || 1;
      const isRegular = (1 - Math.abs(trajH - 1)) >= 0.99 && (1 - Math.abs(trajA - 1)) >= 0.99;
      const regularMatch = !showRegularity || isRegular;

      const safeButsMatch = !showSafeButs || investSignals.IS_SAFE_GOALS;

      const topFormMatch = !showTopForm || investSignals.IS_TOP_FORM_HOME || investSignals.IS_TOP_FORM_AWAY;

      const masterMatch = !showMasterPicks || match.isFinalPick === true;

      return textMatch && dateMatch && favMatch && signalMatch && confidenceMatch && ultraSafeMatch && regularMatch && safeButsMatch && topFormMatch && masterMatch;
    });
  }, [leagueMatches, searchQuery, selectedDate, showTrueFavorites, showSuperSignals, showHighConfidence, showUltraSafe, showRegularity, showSafeButs, showTopForm, showMasterPicks]);

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
          ? 'translate-x-0 w-52 border-r opacity-100' 
          : '-translate-x-full lg:translate-x-0 w-52 lg:w-0 border-r lg:border-r-0 opacity-100 lg:opacity-0 lg:overflow-hidden'}
      `}>
        <div className="p-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 shadow-inner">
            <Terminal className="text-emerald-600 dark:text-emerald-400" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-wide">ColdBetdrox Lab</h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">TITANIUM Intelligence Terminal</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Matrices Actives</div>
          <nav className="flex flex-col gap-1.5">
            {availableLeagues.map(league => (
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
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left
                  ${selectedLeague.id === league.id 
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-medium shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                `}
              >
                <span className="text-lg">{league.flag}</span>
                {league.name}
              </button>
            ))}
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
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 overflow-y-auto lg:overflow-hidden transition-colors duration-300">
        
        {/* Mobile Smart Floating Header (Fixed Overlay - Appears on Scroll Up) */}
        <div className={`
          lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-lg
          transition-all duration-300 ease-out transform
          ${headerVisible && lastScrollY.current > 200 ? 'translate-y-0' : '-translate-y-full'}
        `}>
          <div className="h-16 flex items-center justify-between px-4 gap-4">
             <div className="flex items-center gap-2 shrink-0">
                <button 
                  className="text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={18} />
                </button>
                <div className="flex flex-col">
                  <h1 className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">ColdBetdrox</h1>
                  <p className="text-[8px] text-emerald-500 font-mono tracking-widest uppercase">Live Matrix</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedLeague(MASTER_HUB_LEAGUE);
                    setSelectedMatch(null);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedLeague.id === 'TICKETS' ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                >
                  <Trophy size={14} className={selectedLeague.id === 'TICKETS' ? 'animate-bounce' : ''} /> 
                  <span className="hidden xs:inline">HUB</span>
                  <span className="xs:hidden">HUB</span>
                </button>
                <button
                  onClick={toggleTheme}
                  className="text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button 
                  className="text-emerald-500 p-2"
                  onClick={() => {
                    setMobileSearchOpen(true);
                    setHeaderVisible(true);
                  }}
                >
                  <Search size={20} />
                </button>
             </div>
          </div>
        </div>

        {/* Static Header Section (Scrolls naturally) */}
        <header className="relative z-20 bg-white dark:bg-slate-900 transition-colors duration-300">
          {/* Desktop Header & Mobile Static Top Part */}
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="h-16 flex items-center justify-between px-4 lg:px-6 gap-4">
              {mobileSearchOpen ? (
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
                    <button 
                      className="hidden lg:flex text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                      onClick={() => setMatchListOpen(!matchListOpen)}
                    >
                      {matchListOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                    </button>
                    <div className="hidden xl:flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Activity size={12} className="text-emerald-600 dark:text-emerald-500" />
                      <span>Engine <span className="text-emerald-600 dark:text-emerald-400 font-mono ml-1">ACTIVE</span></span>
                    </div>
                  </div>

                  {/* Desktop Integrated Navigation (Hidden on Mobile) */}
                  <div className="hidden lg:flex flex-1 items-center gap-4 min-w-0">
                    {/* Integrated Date Pills */}
                    <div className="flex-1 flex overflow-x-auto no-scrollbar gap-1.5 snap-x max-w-2xl border-x border-slate-100 dark:border-slate-800/50 px-4">
                      <button
                        onClick={() => setSelectedDate('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight whitespace-nowrap transition-all border snap-start ${
                          selectedDate === 'ALL'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        ALL
                      </button>
                      {availableDates.map(date => {
                        let displayDay = '???';
                        let displayNumber = '';
                        if (date !== 'Date Inconnue') {
                          const d = new Date(`${date}T12:00:00`);
                          displayDay = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
                          displayNumber = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                        }
                        return (
                          <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={`flex flex-col items-center px-3 py-1 rounded-lg transition-all border min-w-[55px] snap-start ${
                              selectedDate === date
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <span className="text-[8px] uppercase font-bold tracking-tighter opacity-70 leading-none mb-0.5">{displayDay}</span>
                            <span className="text-[10px] font-mono font-bold leading-none">{displayNumber}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Integrated Signal Toggles */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar snap-x shrink-0">
                      {[
                        { id: 'master', label: 'MASTER PICKS', icon: <Trophy size={12} />, active: showMasterPicks, toggle: () => setShowMasterPicks(!showMasterPicks), activeClass: 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]' },
                        { id: 'fav', label: 'TRUE FAVS', icon: <ShieldCheck size={12} />, active: showTrueFavorites, toggle: () => setShowTrueFavorites(!showTrueFavorites), activeClass: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' },
                        { id: 'elite', label: 'ELITE SIGNALS', icon: <Zap size={12} />, active: showSuperSignals, toggle: () => setShowSuperSignals(!showSuperSignals), activeClass: 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400' },
                        { id: 'conf', label: 'HIGH CONF', icon: <Target size={12} />, active: showHighConfidence, toggle: () => setShowHighConfidence(!showHighConfidence), activeClass: 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400' },
                        { id: 'safe', label: 'SAFE PICK', icon: <Lock size={12} />, active: showUltraSafe, toggle: () => setShowUltraSafe(!showUltraSafe), activeClass: 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400' },
                        { id: 'reg', label: 'REGULARITY', icon: <LineChart size={12} />, active: showRegularity, toggle: () => setShowRegularity(!showRegularity), activeClass: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400' },
                        { id: 'goals', label: 'SAFE GOALS', icon: <Flame size={12} />, active: showSafeButs, toggle: () => setShowSafeButs(!showSafeButs), activeClass: 'bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400' },
                        { id: 'top', label: 'TOP FORM', icon: <TrendingUp size={12} />, active: showTopForm, toggle: () => setShowTopForm(!showTopForm), activeClass: 'bg-pink-500/10 border-pink-500/50 text-pink-600 dark:text-pink-400' },
                      ].map(sig => (
                        <button
                          key={sig.id}
                          onClick={sig.toggle}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] transition-all font-bold border shrink-0 snap-start ${
                            sig.active 
                              ? `${sig.activeClass} shadow-sm` 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          {sig.icon}
                          <span>{sig.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 lg:gap-3 shrink-0 ml-auto">
                    <button
                      onClick={() => {
                        setSelectedLeague(MASTER_HUB_LEAGUE);
                        setSelectedMatch(null); 
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest lg:tracking-[0.2em] border transition-all ${selectedLeague.id === 'TICKETS' ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-500'}`}
                    >
                      <Trophy size={14} className={selectedLeague.id === 'TICKETS' ? 'animate-bounce' : ''} /> 
                      <span className="hidden xs:inline">{selectedLeague.id === 'TICKETS' ? 'HUB ACTIVE' : 'MASTER HUB'}</span>
                      <span className="xs:hidden">HUB</span>
                    </button>

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
                    
                    <button
                      onClick={toggleTheme}
                      className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    
                    <button 
                      className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2"
                      onClick={() => setMobileSearchOpen(true)}
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

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

        {/* Sticky Filters: This div stays at the top on Mobile, but doesn't cause content jumps */}
        <div className="sticky top-0 z-30 lg:z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-2 flex flex-col gap-2 shadow-sm lg:hidden transition-colors duration-300">
          {/* Mobile Date Pills */}
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 px-4 snap-x">
            <button
              onClick={() => setSelectedDate('ALL')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight whitespace-nowrap transition-all border snap-start ${
                selectedDate === 'ALL'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              ALL
            </button>
            {availableDates.map(date => {
              let displayDay = '???';
              let displayNumber = '';
              if (date !== 'Date Inconnue') {
                const d = new Date(`${date}T12:00:00`);
                displayDay = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
                displayNumber = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              }
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center px-3 py-0.5 rounded-lg transition-all border min-w-[55px] snap-start ${
                    selectedDate === date
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="text-[8px] uppercase font-bold tracking-tighter opacity-70 leading-tight">{displayDay}</span>
                  <span className="text-[10px] font-mono font-bold leading-none">{displayNumber}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Signal Toggles */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 snap-x pb-0.5">
            {[
              { id: 'master', label: 'MASTER', icon: <Trophy size={12} />, active: showMasterPicks, toggle: () => setShowMasterPicks(!showMasterPicks), activeClass: 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]' },
              { id: 'fav', label: 'TRUE FAVS', icon: <ShieldCheck size={12} />, active: showTrueFavorites, toggle: () => setShowTrueFavorites(!showTrueFavorites), activeClass: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' },
              { id: 'elite', label: 'ELITE', icon: <Zap size={12} />, active: showSuperSignals, toggle: () => setShowSuperSignals(!showSuperSignals), activeClass: 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400' },
              { id: 'conf', label: 'HIGH CONF', icon: <Target size={12} />, active: showHighConfidence, toggle: () => setShowHighConfidence(!showHighConfidence), activeClass: 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400' },
              { id: 'safe', label: 'SAFE PICK', icon: <Lock size={12} />, active: showUltraSafe, toggle: () => setShowUltraSafe(!showUltraSafe), activeClass: 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400' },
              { id: 'reg', label: 'REGULARITY', icon: <LineChart size={12} />, active: showRegularity, toggle: () => setShowRegularity(!showRegularity), activeClass: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400' },
              { id: 'goals', label: 'SAFE GOALS', icon: <Flame size={12} />, active: showSafeButs, toggle: () => setShowSafeButs(!showSafeButs), activeClass: 'bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400' },
              { id: 'top', label: 'TOP FORM', icon: <TrendingUp size={12} />, active: showTopForm, toggle: () => setShowTopForm(!showTopForm), activeClass: 'bg-pink-500/10 border-pink-500/50 text-pink-600 dark:text-pink-400' },
            ].map(sig => (
              <button
                key={sig.id}
                onClick={sig.toggle}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] transition-all font-bold border shrink-0 snap-start ${
                  sig.active 
                    ? `${sig.activeClass} shadow-sm` 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {sig.icon}
                <span>{sig.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden">
          {/* Match List Area or Tickets View */}
          {selectedLeague.id === 'TICKETS' ? (
             <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-all duration-500">
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
                border-r border-slate-200 dark:border-slate-800 flex-col bg-white/50 dark:bg-slate-950/50 transition-all duration-300 ease-in-out overflow-hidden shrink-0
                ${selectedMatch ? 'hidden lg:flex' : 'flex'}
                ${matchListOpen ? 'w-full lg:w-80 opacity-100' : 'w-full lg:w-0 lg:border-r-0 lg:opacity-0'}
              `}>
                <div className="w-full lg:w-80 flex flex-col h-full min-h-[500px] lg:min-h-0">
                  <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-200 text-xs tracking-tight">{selectedLeague.name}</h2>
                    <p className="text-[9px] text-slate-500 font-mono tracking-tighter">
                      {filteredMatches.length} MATCHES FOUND
                    </p>
                    </div>
                    {sessionData && <div className="text-[9px] uppercase font-mono tracking-tighter text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Synchronized</div>}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] uppercase tracking-widest font-mono">Loading Matrix...</span>
                    </div>
                  ) : error ? (
                    <div className="p-4 border border-rose-500/30 bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex flex-col gap-2 shadow-inner">
                      <span className="font-bold uppercase tracking-wider text-xs">System Error</span>
                      <span className="text-xs leading-relaxed opacity-90">{error}</span>
                    </div>
                  ) : (
                    <MatchList 
                      matches={filteredMatches} 
                      selectedMatch={selectedMatch}
                      onSelectMatch={handleSelectMatch}
                    />
                  )}
                </div>
              </div>
              </div>

              {/* Match Dashboard Area */}
              <div className={`
                flex-1 overflow-y-visible lg:overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar transition-colors duration-300
                ${!selectedMatch ? 'hidden lg:flex' : 'flex'}
              `}>
                {selectedMatch ? (
                  <div className="p-4 lg:p-8 pb-24 lg:pb-8 w-full">
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
    </div>
  );
}
