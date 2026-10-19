import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from './ui/Badge';
import {
  BarChart3,
  Brain,
  Crosshair,
  Calculator,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Target,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trophy,
  Fingerprint,
  Calendar
} from 'lucide-react';

import TabCoreMarket from './dashboard/TabCoreMarket';
import TabNarrative from './dashboard/TabNarrative';
import TabTactical from './dashboard/TabTactical';
import TabCalibration from './dashboard/TabCalibration';
import TabRiskContext from './dashboard/TabRiskContext';
import TabSeries from './dashboard/TabSeries';
import TabDeepDive from './dashboard/TabDeepDive';
import { TeamLogo, LeagueLogo, getLeagueDisplayName, getLeagueCountryLabel } from '../utils/teamLogos';
import { getSeriesStatsUrl, validateSeriesMetadata } from '../utils/titaniumLoader';
import { getMatchScheduleDetails } from '../utils/matchSchedule';

export function MatchDashboard({ match, leagueReport, sessionId, onClose }) {
  const [activeTab, setActiveTab] = useState('tactical');
  const [outgoingTab, setOutgoingTab] = useState(null);
  const [slideDirection, setSlideDirection] = useState('forward'); // 'forward' (leftward slide) or 'backward' (rightward slide)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [serieStats, setSerieStats] = useState(null);
  const [seriesError, setSeriesError] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const dashboardRef = useRef(null);
  const headerRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const activeSeriesFetchRef = useRef(null);
  const transitionTimerRef = useRef(null);

  // Touch refs for swipe
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndX = useRef(null);
  const touchEndY = useRef(null);

  const TABS = [
    { id: 'tactical', label: 'Props & Statistical Markets', mobileLabel: 'PROPS', icon: <Crosshair size={14} /> },
    { id: 'core', label: 'Core Market', mobileLabel: 'CORE', icon: <BarChart3 size={14} /> },
    { id: 'deepdive', label: 'Signals & Bet Review', mobileLabel: 'BET REVIEW', icon: <Fingerprint size={14} /> },
    { id: 'risk', label: 'Risk & Restrictions', mobileLabel: 'RISK', icon: <Activity size={14} /> },
    { id: 'series', label: 'Series & Form', mobileLabel: 'SERIES', icon: <TrendingUp size={14} /> },
    { id: 'narrative', label: 'Narrative & Justice', mobileLabel: 'NARRATIVE', icon: <Brain size={14} /> },
    { id: 'calibration', label: 'Model Diagnostics', mobileLabel: 'DIAGNOSTICS', icon: <Calculator size={14} /> },
  ];

  useEffect(() => {
    async function fetchSerieStats() {
      if (!match) return;
      const currentMatchId = match.Match_ID || match.Matchup;
      activeSeriesFetchRef.current = currentMatchId;
      setSerieStats(null);
      setSeriesError(null);
      setLoadingStats(true);

      if (match.series_topology?.mode === 'invalid') {
        setLoadingStats(false);
        setSeriesError(match.series_topology.reason || "Topologie des séries incompatible ou ambiguë");
        return;
      }

      const seriesUrl = getSeriesStatsUrl(match, sessionId);
      if (!seriesUrl) {
        setLoadingStats(false);
        setSeriesError("URL des séries statistiques indisponible");
        return;
      }

      try {
        const res = await fetch(seriesUrl);
        if (res.ok) {
          const contentType = res.headers?.get ? (res.headers.get('content-type') || '') : '';
          if (contentType && contentType.includes('text/html')) {
            if (activeSeriesFetchRef.current === currentMatchId) {
              setSerieStats(null);
              setSeriesError(`Fichier de séries introuvable (réponse HTML inattendue sur ${seriesUrl})`);
            }
            return;
          }

          let stats;
          try {
            stats = await res.json();
          } catch (parseErr) {
            if (activeSeriesFetchRef.current === currentMatchId) {
              setSerieStats(null);
              setSeriesError(`Réponse non-JSON ou HTML inattendue sur ${seriesUrl} (${parseErr.message})`);
            }
            return;
          }

          if (activeSeriesFetchRef.current === currentMatchId) {
            const validation = validateSeriesMetadata(stats, match);
            if (validation.valid) {
              setSerieStats(stats);
              setSeriesError(null);
            } else {
              setSerieStats(null);
              setSeriesError(`Métadonnées rejetées : ${validation.reason}`);
              console.warn("[TITANIUM SER-01] Series payload rejected:", validation.reason);
            }
          }
        } else {
          if (activeSeriesFetchRef.current === currentMatchId) {
            setSerieStats(null);
            setSeriesError(`Séries non disponibles pour ce match (HTTP ${res.status})`);
          }
        }
      } catch (e) {
        console.error("Error fetching serie stats:", e);
        if (activeSeriesFetchRef.current === currentMatchId) {
          setSerieStats(null);
          setSeriesError(`Erreur réseau lors du chargement des séries : ${e.message}`);
        }
      } finally {
        if (activeSeriesFetchRef.current === currentMatchId) {
          setLoadingStats(false);
        }
      }
    }

    fetchSerieStats();
  }, [match, sessionId]);

  // Navigation centralisée vers un onglet cible avec animation directionnelle fluide
  const navigateToTab = useCallback((targetTabId) => {
    if (!targetTabId || targetTabId === activeTab) return;
    const currentIdx = TABS.findIndex(t => t.id === activeTab);
    const targetIdx = TABS.findIndex(t => t.id === targetTabId);
    if (targetIdx === -1) return;

    const direction = targetIdx > currentIdx ? 'forward' : 'backward';

    // Détection de l'environnement Desktop (Instant Switch) ou prefers-reduced-motion
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isDesktop = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(min-width: 768px)').matches;

    // Réinitialisation de tout timer de transition en cours (changement rapide)
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    // Réinitialisation instantanée du défilement vertical vers le haut (conteneur scrollable parent & fenêtre)
    if (dashboardRef.current) {
      const scrollParent = dashboardRef.current.closest('.overflow-y-auto');
      if (scrollParent && scrollParent.scrollTop > 0) {
        scrollParent.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Sur PC / Desktop (>= 768px) ou si animations réduites : bascule instantanée sans transition bi-panneaux
    if (isDesktop || prefersReducedMotion) {
      setOutgoingTab(null);
      setIsTransitioning(false);
      setActiveTab(targetTabId);
      setSlideDirection(direction);
      return;
    }

    // Sur Mobile (< 768px) : transition directionnelle bi-panneaux fluide
    setOutgoingTab(activeTab);
    setActiveTab(targetTabId);
    setSlideDirection(direction);
    setIsTransitioning(true);

    transitionTimerRef.current = setTimeout(() => {
      setOutgoingTab(null);
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, 250);
  }, [activeTab]);

  // Nettoyage des timers lors du démontage
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Sécurisation au redimensionnement : purger tout état de transition bi-panneau résiduel sur Desktop
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768 && isTransitioning) {
        if (transitionTimerRef.current) {
          clearTimeout(transitionTimerRef.current);
          transitionTimerRef.current = null;
        }
        setOutgoingTab(null);
        setIsTransitioning(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isTransitioning]);

  // Déterminants de navigation séquentielle (Flèches PC / Raccourcis)
  const currentTabIndex = TABS.findIndex(t => t.id === activeTab);
  const isFirstTab = currentTabIndex <= 0;
  const isLastTab = currentTabIndex >= TABS.length - 1;

  const goToPrevTab = useCallback((e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const curIdx = TABS.findIndex(t => t.id === activeTab);
    if (curIdx > 0) {
      navigateToTab(TABS[curIdx - 1].id);
    }
  }, [activeTab, navigateToTab]);

  const goToNextTab = useCallback((e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const curIdx = TABS.findIndex(t => t.id === activeTab);
    if (curIdx >= 0 && curIdx < TABS.length - 1) {
      navigateToTab(TABS[curIdx + 1].id);
    }
  }, [activeTab, navigateToTab]);

  // Raccourcis clavier PC (Flèches gauche / droite pour naviguer entre onglets)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        const curIdx = TABS.findIndex(t => t.id === activeTab);
        if (curIdx > 0) {
          e.preventDefault();
          navigateToTab(TABS[curIdx - 1].id);
        }
      } else if (e.key === 'ArrowRight') {
        const curIdx = TABS.findIndex(t => t.id === activeTab);
        if (curIdx >= 0 && curIdx < TABS.length - 1) {
          e.preventDefault();
          navigateToTab(TABS[curIdx + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, navigateToTab]);

  // Logique gestuelle de swipe mobile avec filtrage directionnel et zones interactives
  const handleTouchStart = (e) => {
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    // Ignorer le swipe s'il provient de la barre d'onglets défilante elle-même
    if (tabsContainerRef.current && tabsContainerRef.current.contains(e.target)) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    // Ignorer le swipe sur les curseurs, inputs ou zones annotées data-no-swipe
    if (e.target.closest && e.target.closest('input[type="range"], [data-no-swipe="true"]')) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const minDistance = 50;

    // Réinitialisation immédiate des coordonnées
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;

    // Détection stricte d'un mouvement horizontal dominant (au moins 1.5x le déplacement vertical)
    if (absX > minDistance && absX > absY * 1.5) {
      const currentIdx = TABS.findIndex(tab => tab.id === activeTab);
      if (deltaX > 0 && currentIdx < TABS.length - 1) {
        // Swipe vers la gauche -> Onglet suivant
        navigateToTab(TABS[currentIdx + 1].id);
      } else if (deltaX < 0 && currentIdx > 0) {
        // Swipe vers la droite -> Onglet précédent
        navigateToTab(TABS[currentIdx - 1].id);
      }
    }
  };

  // Centrage automatique et fluide de l'onglet actif dans le bandeau de navigation
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTabElement = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeTabElement) {
        const container = tabsContainerRef.current;
        const scrollLeft = activeTabElement.offsetLeft - (container.offsetWidth / 2) + (activeTabElement.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeTab]);

  if (!match) return null;

  const probs = match.True_Probabilities || {};
  const investSignals = match.Risk_Management_Context?.Investment_Signals || {};
  const isKillSwitch = investSignals.IS_KILL_SWITCH_ACTIVE || ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));

  // Extraction déterministe des noms des clubs avec fallback sécurisé
  const parts = (match.Matchup || '').split(' vs ');
  const rawHome = parts[0] || '';
  const rawAway = parts[1] || '';
  const homeName = match.displayHome || match.shortHome || parts[0] || 'Domicile';
  const awayName = match.displayAway || match.shortAway || parts[1] || 'Extérieur';

  // Formatage de la journée de compétition (Journée N ou libellé de phase brut)
  const formatRound = (round) => {
    if (round === null || round === undefined || round === '') return null;
    const str = String(round).trim();
    if (!str) return null;
    if (/^\d+$/.test(str)) {
      return `Journée ${str}`;
    }
    return str;
  };
  const roundLabel = formatRound(match.round);
  const schedule = getMatchScheduleDetails(match);
  const countryLabel = getLeagueCountryLabel(match.League || match.league);

  // Restitution pure et découplée des panneaux analytiques pour la transition fluide
  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'tactical':
        return <TabTactical match={match} onNavigateTab={navigateToTab} />;
      case 'core':
        return <TabCoreMarket match={match} onNavigateTab={navigateToTab} />;
      case 'deepdive':
        return <TabDeepDive match={match} leagueReport={leagueReport} onNavigateTab={navigateToTab} />;
      case 'risk':
        return <TabRiskContext match={match} onNavigateTab={navigateToTab} />;
      case 'series':
        return (
          <div className="flex flex-col gap-4">
            {seriesError && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl font-mono">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Séries indisponibles ou rejetées : {seriesError}</span>
              </div>
            )}
            <TabSeries stats={serieStats} match={match} loading={loadingStats} onNavigateTab={navigateToTab} />
          </div>
        );
      case 'narrative':
        return <TabNarrative match={match} onNavigateTab={navigateToTab} />;
      case 'calibration':
        return <TabCalibration match={match} onNavigateTab={navigateToTab} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={dashboardRef}
      className="flex flex-col gap-4 relative transition-colors duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Unified Sticky Header Section - Stable Constant-Height Professional Sports Terminal Layout */}
      <div className="sticky top-0 z-20 -mx-4 px-4 lg:-mx-8 lg:px-8 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs select-none">
        {/* Main Header Arena */}
        <div className="py-2 lg:py-2.5">
          {/* DESKTOP (lg+): 3-Column Terminal Layout */}
          {/* Gauche: Championnat/Journée + Date & Heure inférieure gauche */}
          {/* Centre: Confrontation directe avec logos bien proportionnés et espacement resserré */}
          {/* Droite: Badges analytiques secondaires */}
          <div className="hidden lg:grid lg:grid-cols-[250px_1fr_250px] xl:grid-cols-[280px_1fr_280px] items-center gap-4 min-w-0">
            {/* Zone Gauche Desktop : Meta Compétition & Horodatage inférieur gauche */}
            <div className="flex flex-col justify-center gap-1 min-w-0">
              {/* Ligne 1 : Championnat & Pays & Journée */}
              <div className="flex items-center gap-1.5 min-w-0 text-xs">
                {match.League && (
                  <>
                    <LeagueLogo league={match.League} size="xs" className="shrink-0 opacity-85" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-tight truncate max-w-[140px] xl:max-w-[170px]" title={getLeagueDisplayName(match.League)}>
                      {getLeagueDisplayName(match.League)}
                    </span>
                  </>
                )}
                {countryLabel && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[110px]" title={countryLabel}>
                      {countryLabel}
                    </span>
                  </>
                )}
                {roundLabel && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 px-1.5 py-0.2 rounded border border-indigo-200/50 dark:border-indigo-800/40 shrink-0">
                      {roundLabel}
                    </span>
                  </>
                )}
              </div>

              {/* Ligne 2 : Date et Heure (partie inférieure gauche de l'en-tête) */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono min-w-0">
                <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{schedule.dateLong}</span>
                {schedule.time && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">{schedule.time}</span>
                  </>
                )}
                {schedule.isLive && (
                  <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            {/* Zone Centrale Desktop : Confrontation Directe Élégante & Compacte */}
            <div className="flex items-center justify-center gap-3 xl:gap-4 w-full max-w-lg mx-auto min-w-0">
              {/* Club Domicile */}
              <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-right">
                <span
                  title={homeName}
                  className="font-sans font-bold text-sm lg:text-[15px] xl:text-base text-slate-900 dark:text-white leading-tight truncate tracking-tight"
                >
                  {homeName}
                </span>
                <TeamLogo
                  teamName={rawHome}
                  league={match.League}
                  size="w-9 h-9 lg:w-10 lg:h-10"
                  alt={homeName}
                  className="drop-shadow-xs shrink-0"
                />
              </div>

              {/* Séparateur VS Central */}
              <div className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 shadow-2xs select-none shrink-0">
                VS
              </div>

              {/* Club Extérieur */}
              <div className="flex items-center justify-start gap-2.5 flex-1 min-w-0 text-left">
                <TeamLogo
                  teamName={rawAway}
                  league={match.League}
                  size="w-9 h-9 lg:w-10 lg:h-10"
                  alt={awayName}
                  className="drop-shadow-xs shrink-0"
                />
                <span
                  title={awayName}
                  className="font-sans font-bold text-sm lg:text-[15px] xl:text-base text-slate-900 dark:text-white leading-tight truncate tracking-tight"
                >
                  {awayName}
                </span>
              </div>
            </div>

            {/* Zone Droite Desktop : Badges Analytiques */}
            <div className="flex items-center justify-end gap-1.5 flex-wrap shrink-0">
              {match.isFinalPick && (
                <Badge variant="success" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-wider bg-emerald-600 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse font-mono">
                  <Trophy size={10} /> MASTER PICK
                </Badge>
              )}

              {match.Calibration_Diagnostics?.confidence_index !== undefined && (
                <Badge variant={match.Calibration_Diagnostics.confidence_index >= 0.5 ? 'success' : 'warning'} className="text-[9px] font-mono tracking-wider px-2 py-0.5">
                  CONF: {(match.Calibration_Diagnostics.confidence_index * 100).toFixed(0)}%
                </Badge>
              )}

              {investSignals.IS_ULTRA_SAFE && (
                <Badge variant="success" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-wider border-emerald-500/50 font-mono">
                  <ShieldCheck size={10} /> ULTRA SAFE
                </Badge>
              )}

              {isKillSwitch && (
                <Badge variant="danger" className="text-[9px] flex items-center gap-1 px-2 py-0.5 uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 font-mono">
                  <AlertTriangle size={10} /> KILL-SWITCH
                </Badge>
              )}

              {match.Data_Integrity?.map((flag, idx) => {
                if (flag === 'COMPLETE') return null;
                return <Badge key={idx} variant="info" className="text-[8px] opacity-70 px-1 shrink-0">{flag}</Badge>;
              })}
            </div>
          </div>

          {/* MOBILE (< lg): Disposition Responsive & Compacte */}
          <div className="flex flex-col gap-1.5 lg:hidden min-w-0">
            {/* Étage 1 Mobile : Retour + Ligue/Journée + Badges */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-0.5 -ml-1 shrink-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    title="Retour à la liste"
                    aria-label="Retour à la liste"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}

                <div className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 min-w-0">
                  {match.League && (
                    <>
                      <LeagueLogo league={match.League} size="xs" className="shrink-0 opacity-80" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 tracking-tight truncate max-w-[100px] xs:max-w-[130px]">
                        {getLeagueDisplayName(match.League)}
                      </span>
                    </>
                  )}
                  {countryLabel && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[80px] xs:max-w-[100px]">
                        {countryLabel}
                      </span>
                    </>
                  )}
                  {roundLabel && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                      <span className="font-mono text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 px-1 py-0.2 rounded border border-indigo-200/50 dark:border-indigo-800/40 shrink-0">
                        {roundLabel}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Badges Mobile */}
              <div className="flex items-center gap-1 shrink-0">
                {match.isFinalPick && (
                  <Badge variant="success" className="text-[8px] flex items-center gap-0.5 px-1.5 py-0.5 uppercase tracking-wider bg-emerald-600 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse font-mono">
                    <Trophy size={9} /> <span className="hidden xs:inline">MASTER</span> PICK
                  </Badge>
                )}

                {match.Calibration_Diagnostics?.confidence_index !== undefined && (
                  <Badge variant={match.Calibration_Diagnostics.confidence_index >= 0.5 ? 'success' : 'warning'} className="text-[8px] font-mono tracking-wider px-1.5 py-0.5">
                    CONF: {(match.Calibration_Diagnostics.confidence_index * 100).toFixed(0)}%
                  </Badge>
                )}

                {investSignals.IS_ULTRA_SAFE && (
                  <Badge variant="success" className="text-[8px] flex items-center gap-0.5 px-1.5 py-0.5 uppercase tracking-wider border-emerald-500/50 font-mono">
                    <ShieldCheck size={9} /> SAFE
                  </Badge>
                )}

                {isKillSwitch && (
                  <Badge variant="danger" className="text-[8px] flex items-center gap-0.5 px-1.5 py-0.5 uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 font-mono">
                    <AlertTriangle size={9} /> KILL
                  </Badge>
                )}
              </div>
            </div>

            {/* Étage 2 Mobile : Confrontation Centrale Symétrique (Logos 32-36px + Noms Lisibles) */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 max-w-sm mx-auto w-full py-0.5">
              {/* Club Domicile */}
              <div className="flex flex-col items-center text-center min-w-0">
                <TeamLogo
                  teamName={rawHome}
                  league={match.League}
                  size="w-8 h-8 sm:w-9 sm:h-9"
                  alt={homeName}
                  className="drop-shadow-xs shrink-0"
                />
                <span
                  title={homeName}
                  className="mt-1 font-sans font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2 break-words max-w-[120px] xs:max-w-[140px] tracking-tight"
                >
                  {homeName}
                </span>
              </div>

              {/* VS Central */}
              <div className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 self-center">
                VS
              </div>

              {/* Club Extérieur */}
              <div className="flex flex-col items-center text-center min-w-0">
                <TeamLogo
                  teamName={rawAway}
                  league={match.League}
                  size="w-8 h-8 sm:w-9 sm:h-9"
                  alt={awayName}
                  className="drop-shadow-xs shrink-0"
                />
                <span
                  title={awayName}
                  className="mt-1 font-sans font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2 break-words max-w-[120px] xs:max-w-[140px] tracking-tight"
                >
                  {awayName}
                </span>
              </div>
            </div>

            {/* Étage 3 Mobile : Date et Heure (Partie inférieure gauche du header) */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 px-0.5">
              <div className="inline-flex items-center gap-1.5">
                <Calendar size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">{schedule.shortDate || schedule.dateLong}</span>
                {schedule.time && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{schedule.time}</span>
                  </>
                )}
                {schedule.isLive && (
                  <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.2 rounded-full text-[8px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    LIVE
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modernized Integrated Tab Navigation Bar with PC Chevrons */}
        <div className="border-t border-slate-200/70 dark:border-slate-800/70 py-1">
          <div className="flex items-center gap-1 min-w-0">
            {/* Flèche précédente (PC / desktop) */}
            <button
              type="button"
              data-testid="chevron-prev-tab"
              onClick={goToPrevTab}
              disabled={isFirstTab}
              aria-label="Onglet précédent"
              title={!isFirstTab ? `Onglet précédent (${TABS[currentTabIndex - 1]?.label})` : 'Premier onglet atteint'}
              className={`
                hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 dark:text-slate-400 shrink-0 transition-all duration-150 select-none
                ${isFirstTab
                  ? 'opacity-25 cursor-not-allowed text-slate-300 dark:text-slate-700'
                  : 'hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95 cursor-pointer'}
              `}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Liste d'onglets défilante */}
            <div
              ref={tabsContainerRef}
              className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth px-0.5 flex-1 min-w-0"
            >
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    className={`
                      group relative flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap transition-all duration-150 select-none shrink-0
                      ${isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-semibold'}
                    `}
                  >
                    <span className={`transition-colors ${isActive ? 'text-emerald-400 dark:text-emerald-600' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                      {tab.icon}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.mobileLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Flèche suivante (PC / desktop) */}
            <button
              type="button"
              data-testid="chevron-next-tab"
              onClick={goToNextTab}
              disabled={isLastTab}
              aria-label="Onglet suivant"
              title={!isLastTab ? `Onglet suivant (${TABS[currentTabIndex + 1]?.label})` : 'Dernier onglet atteint'}
              className={`
                hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 dark:text-slate-400 shrink-0 transition-all duration-150 select-none
                ${isLastTab
                  ? 'opacity-25 cursor-not-allowed text-slate-300 dark:text-slate-700'
                  : 'hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95 cursor-pointer'}
              `}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content with Directional Horizontal Sliding Panels */}
      <div data-testid="tab-content-container" className="mt-4 relative overflow-hidden w-full">
        {isTransitioning && outgoingTab && (
          <div
            key={`outgoing-${outgoingTab}`}
            aria-hidden="true"
            className={`w-full absolute top-0 left-0 pointer-events-none select-none z-0 bg-slate-50 dark:bg-slate-950 ${
              slideDirection === 'forward' ? 'animate-tab-slide-out-left' : 'animate-tab-slide-out-right'
            }`}
          >
            {renderTabContent(outgoingTab)}
          </div>
        )}

        <div
          key={`incoming-${activeTab}`}
          className={`w-full relative z-10 bg-slate-50 dark:bg-slate-950 ${
            isTransitioning
              ? slideDirection === 'forward'
                ? 'animate-tab-slide-in-right'
                : 'animate-tab-slide-in-left'
              : ''
          }`}
        >
          {renderTabContent(activeTab)}
        </div>
      </div>
    </div>
  );
}
