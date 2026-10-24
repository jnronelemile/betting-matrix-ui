import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Calendar,
  Star,
  FolderPlus
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
import { useFavorites } from '../context/FavoritesContext.jsx';
import { GroupManagerModal } from './favorites/GroupManagerModal.jsx';

export function MatchDashboard({ match, leagueReport, sessionId, onClose }) {
  const { isMatchFavorite, toggleMatchFavorite, getMatchFavorite, getGroup } = useFavorites();
  const isFav = isMatchFavorite(match);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const favoriteData = isFav ? getMatchFavorite(match) : null;
  const groupIds = favoriteData?.groupIds || [];
  const groupCount = groupIds.length;
  const dashboardGroupLabel = useMemo(() => {
    if (groupCount === 0) return 'Classer (À classer)';
    if (groupCount === 1) {
      const g = getGroup(groupIds[0]);
      return g?.name ? `Groupe: ${g.name}` : '1 groupe';
    }
    return `${groupCount} groupes`;
  }, [groupCount, groupIds, getGroup]);

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
  const tabIndicatorRef = useRef(null);
  const tabsGeometryRef = useRef({});
  const activeSeriesFetchRef = useRef(null);
  const transitionTimerRef = useRef(null);

  // Refs et état pour le suivi tactile interactif au pixel près (mobile)
  const [swipeNeighbor, setSwipeNeighbor] = useState(null); // { id: string, direction: 'next' | 'prev' } | null
  const contentContainerRef = useRef(null);
  const currentPanelRef = useRef(null);
  const neighborPanelRef = useRef(null);
  const finishTimeoutRef = useRef(null);

  const touchStateRef = useRef({
    startX: 0,
    startY: 0,
    currentDx: 0,
    startTime: 0,
    isDragging: false,
    isVerticalScroll: false,
    direction: null,
    neighborTabId: null,
    containerWidth: 0,
    isAnimatingRelease: false,
  });

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
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  // Mesure optimisée de la géométrie des onglets (évite les reflows pendant le swipe)
  const updateTabsGeometry = useCallback(() => {
    if (!tabsContainerRef.current) return;
    const buttons = tabsContainerRef.current.querySelectorAll('[data-tab-id]');
    const geoMap = {};
    buttons.forEach(btn => {
      const id = btn.getAttribute('data-tab-id');
      if (id) {
        geoMap[id] = {
          left: btn.offsetLeft,
          width: btn.offsetWidth,
        };
      }
    });
    tabsGeometryRef.current = geoMap;
  }, []);

  // Positionnement direct de l'indicateur d'onglet sans re-rendu React
  const setIndicatorPosition = useCallback((left, width, transition = null) => {
    if (!tabIndicatorRef.current) return;
    if (transition !== null) {
      tabIndicatorRef.current.style.transition = transition;
    }
    tabIndicatorRef.current.style.left = `${left}px`;
    tabIndicatorRef.current.style.width = `${width}px`;
  }, []);

  // Positionnement de l'indicateur au changement d'onglet actif
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      updateTabsGeometry();
      const geo = tabsGeometryRef.current[activeTab];
      if (geo) {
        const prefersReducedMotion = typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const transition = prefersReducedMotion
          ? 'none'
          : 'left 200ms cubic-bezier(0.2, 0.9, 0.3, 1), width 200ms cubic-bezier(0.2, 0.9, 0.3, 1)';

        setIndicatorPosition(geo.left, geo.width, transition);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [activeTab, updateTabsGeometry, setIndicatorPosition]);

  // Sécurisation au redimensionnement : purger tout état de transition ou swipe résiduel et recalculer les onglets
  useEffect(() => {
    const handleResize = () => {
      updateTabsGeometry();
      const geo = tabsGeometryRef.current[activeTab];
      if (geo) {
        setIndicatorPosition(geo.left, geo.width, 'none');
      }

      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        if (isTransitioning) {
          if (transitionTimerRef.current) {
            clearTimeout(transitionTimerRef.current);
            transitionTimerRef.current = null;
          }
          setOutgoingTab(null);
          setIsTransitioning(false);
        }
        if (touchStateRef.current.isDragging || swipeNeighbor) {
          if (finishTimeoutRef.current) {
            clearTimeout(finishTimeoutRef.current);
            finishTimeoutRef.current = null;
          }
          if (currentPanelRef.current) {
            currentPanelRef.current.style.transition = '';
            currentPanelRef.current.style.transform = '';
          }
          if (neighborPanelRef.current) {
            neighborPanelRef.current.style.transition = '';
            neighborPanelRef.current.style.transform = '';
          }
          setSwipeNeighbor(null);
          touchStateRef.current.isDragging = false;
          touchStateRef.current.isAnimatingRelease = false;
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, isTransitioning, swipeNeighbor, updateTabsGeometry, setIndicatorPosition]);

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

  // Helper pour vérifier si un élément est une zone d'interaction où le swipe horizontal est exclu
  const isInteractiveTarget = useCallback((target) => {
    if (!target) return false;
    // Ignorer si le toucher débute sur la barre d'onglets défilante
    if (tabsContainerRef.current && tabsContainerRef.current.contains(target)) {
      return true;
    }
    // Ignorer sur les inputs, textareas, selects, curseurs et éléments explicitement exclus
    if (target.closest && target.closest('input, textarea, select, [data-no-swipe="true"]')) {
      return true;
    }
    // Ignorer si le toucher est dans un conteneur interne à défilement horizontal (ex: tables, badges scrollables)
    let el = target;
    while (el && el !== contentContainerRef.current && el !== document.body) {
      if (el.scrollWidth > el.clientWidth && el !== dashboardRef.current) {
        const overflowX = window.getComputedStyle(el).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }, []);

  // Début du geste tactile (Mobile < 768px uniquement)
  const handleTouchStart = useCallback((e) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    if (touchStateRef.current.isAnimatingRelease) return;
    if (isInteractiveTarget(e.target)) return;

    // Prise en compte de prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const touch = e.targetTouches[0];
    const containerW = contentContainerRef.current ? contentContainerRef.current.offsetWidth : (window.innerWidth || 390);

    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentDx: 0,
      startTime: Date.now(),
      isDragging: false,
      isVerticalScroll: false,
      direction: null,
      neighborTabId: null,
      containerWidth: containerW,
      isAnimatingRelease: false,
    };

    updateTabsGeometry();
  }, [isInteractiveTarget, updateTabsGeometry]);

  // Déplacement tactile au doigt en temps réel
  const handleTouchMove = useCallback((e) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    if (touchStateRef.current.isAnimatingRelease) return;
    if (touchStateRef.current.isVerticalScroll) return;

    const touch = e.targetTouches[0];
    const dx = touch.clientX - touchStateRef.current.startX;
    const dy = touch.clientY - touchStateRef.current.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Phase 1 : Détermination stricte de l'intention (Scroll vertical vs Swipe horizontal)
    if (!touchStateRef.current.isDragging) {
      if (absY > absX && absY > 7) {
        // Défilement vertical naturel : laisser le navigateur gérer nativement sans interférence
        touchStateRef.current.isVerticalScroll = true;
        return;
      }
      if (absX > 8 && absX > absY * 1.1) {
        // Défilement horizontal dominant : verrouiller le swipe interactif
        touchStateRef.current.isDragging = true;
      } else {
        return;
      }
    }

    // Phase 2 : En cours de glissement horizontal piloté par le doigt
    if (touchStateRef.current.isDragging) {
      if (e.cancelable) e.preventDefault();

      const curIdx = TABS.findIndex(t => t.id === activeTab);
      const direction = dx < 0 ? 'next' : 'prev';
      let neighborId = null;

      if (direction === 'next') {
        if (curIdx < TABS.length - 1) {
          neighborId = TABS[curIdx + 1].id;
        }
      } else {
        if (curIdx > 0) {
          neighborId = TABS[curIdx - 1].id;
        }
      }

      // Aux extrémités (PROPS à gauche, DIAGNOSTICS à droite) : résistance élastique sans panneau vide
      let effectiveDx = dx;
      if (!neighborId) {
        effectiveDx = dx * 0.15;
      }

      // Montage / bascule dynamique du panneau voisin
      if (neighborId) {
        if (!swipeNeighbor || swipeNeighbor.id !== neighborId || swipeNeighbor.direction !== direction) {
          setSwipeNeighbor({ id: neighborId, direction });
        }
      } else if (swipeNeighbor) {
        setSwipeNeighbor(null);
      }

      touchStateRef.current.currentDx = effectiveDx;
      touchStateRef.current.direction = direction;
      touchStateRef.current.neighborTabId = neighborId;

      // Translation GPU directe en temps réel synchronisée avec le doigt (zéro rerender)
      const containerW = touchStateRef.current.containerWidth || 390;
      if (currentPanelRef.current) {
        currentPanelRef.current.style.transition = 'none';
        currentPanelRef.current.style.transform = `translate3d(${effectiveDx}px, 0, 0)`;
      }
      if (neighborPanelRef.current && neighborId) {
        const neighborOffset = direction === 'next' ? containerW + effectiveDx : -containerW + effectiveDx;
        neighborPanelRef.current.style.transition = 'none';
        neighborPanelRef.current.style.transform = `translate3d(${neighborOffset}px, 0, 0)`;
      }

      // Synchronisation progressive de l'indicateur d'onglet tactile
      const currentGeo = tabsGeometryRef.current[activeTab];
      if (currentGeo) {
        if (neighborId && tabsGeometryRef.current[neighborId]) {
          const neighborGeo = tabsGeometryRef.current[neighborId];
          const progress = Math.min(1, Math.abs(effectiveDx) / containerW);
          const interpolatedLeft = currentGeo.left + (neighborGeo.left - currentGeo.left) * progress;
          const interpolatedWidth = currentGeo.width + (neighborGeo.width - currentGeo.width) * progress;
          setIndicatorPosition(interpolatedLeft, interpolatedWidth, 'none');
        } else {
          // Résistance élastique aux extrémités
          const progress = Math.min(1, Math.abs(effectiveDx) / containerW);
          const stretchFactor = dx < 0 ? progress * 10 : -progress * 10;
          setIndicatorPosition(currentGeo.left + (stretchFactor < 0 ? stretchFactor : 0), currentGeo.width + Math.abs(stretchFactor), 'none');
        }
      }
    }
  }, [activeTab, swipeNeighbor, setIndicatorPosition]);

  // Relâchement du doigt : validation ou annulation amortie
  const handleTouchEnd = useCallback(() => {
    if (!touchStateRef.current.isDragging) {
      touchStateRef.current.isDragging = false;
      touchStateRef.current.isVerticalScroll = false;
      return;
    }

    const { currentDx, containerWidth, startTime, direction, neighborTabId } = touchStateRef.current;
    const containerW = containerWidth || 390;
    const dt = Date.now() - startTime;
    const velocity = dt > 0 ? currentDx / dt : 0;

    // Décision de validation (Commit) vs annulation (Cancel)
    let shouldCommit = false;
    if (neighborTabId) {
      if (direction === 'next') {
        shouldCommit = (currentDx < -containerW * 0.22) || (velocity < -0.32 && currentDx < -25);
      } else if (direction === 'prev') {
        shouldCommit = (currentDx > containerW * 0.22) || (velocity > 0.32 && currentDx > 25);
      }
    }

    touchStateRef.current.isAnimatingRelease = true;

    if (shouldCommit && neighborTabId) {
      // Finition fluide vers l'onglet voisin depuis la position actuelle
      const duration = 220;
      const ease = 'cubic-bezier(0.2, 0.9, 0.3, 1)';
      const targetCurrent = direction === 'next' ? -containerW : containerW;

      if (currentPanelRef.current) {
        currentPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        currentPanelRef.current.style.transform = `translate3d(${targetCurrent}px, 0, 0)`;
      }
      if (neighborPanelRef.current) {
        neighborPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        neighborPanelRef.current.style.transform = 'translate3d(0px, 0, 0)';
      }

      // Animer l'indicateur d'onglet vers le voisin
      const neighborGeo = tabsGeometryRef.current[neighborTabId];
      if (neighborGeo) {
        setIndicatorPosition(neighborGeo.left, neighborGeo.width, `left ${duration}ms ${ease}, width ${duration}ms ${ease}`);
      }

      finishTimeoutRef.current = setTimeout(() => {
        // Remise à zéro instantanée du scroll vertical vers le haut pour le nouveau contenu
        if (dashboardRef.current) {
          const scrollParent = dashboardRef.current.closest('.overflow-y-auto');
          if (scrollParent && scrollParent.scrollTop > 0) {
            scrollParent.scrollTo({ top: 0, behavior: 'instant' });
          }
        }
        if (neighborPanelRef.current) {
          neighborPanelRef.current.style.transition = '';
        }
        setActiveTab(neighborTabId);
        setSwipeNeighbor(null);
        touchStateRef.current.isDragging = false;
        touchStateRef.current.isAnimatingRelease = false;
        finishTimeoutRef.current = null;
      }, duration);
    } else {
      // Annulation : retour amorti à la position d'origine (position de lecture conservée)
      const duration = 200;
      const ease = 'cubic-bezier(0.2, 0.9, 0.3, 1)';

      if (currentPanelRef.current) {
        currentPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        currentPanelRef.current.style.transform = 'translate3d(0px, 0, 0)';
      }
      if (neighborPanelRef.current && neighborTabId) {
        const targetNeighbor = direction === 'next' ? containerW : -containerW;
        neighborPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        neighborPanelRef.current.style.transform = `translate3d(${targetNeighbor}px, 0, 0)`;
      }

      // Animer l'indicateur d'onglet de retour vers l'onglet actif
      const currentGeo = tabsGeometryRef.current[activeTab];
      if (currentGeo) {
        setIndicatorPosition(currentGeo.left, currentGeo.width, `left ${duration}ms ${ease}, width ${duration}ms ${ease}`);
      }

      finishTimeoutRef.current = setTimeout(() => {
        if (currentPanelRef.current) {
          currentPanelRef.current.style.transition = '';
          currentPanelRef.current.style.transform = '';
        }
        if (neighborPanelRef.current) {
          neighborPanelRef.current.style.transition = '';
          neighborPanelRef.current.style.transform = '';
        }
        setSwipeNeighbor(null);
        touchStateRef.current.isDragging = false;
        touchStateRef.current.isAnimatingRelease = false;
        finishTimeoutRef.current = null;
      }, duration);
    }
  }, [activeTab, setIndicatorPosition]);

  // Interruption système (touchcancel)
  const handleTouchCancel = useCallback(() => {
    if (!touchStateRef.current.isDragging) return;
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    if (currentPanelRef.current) {
      currentPanelRef.current.style.transition = 'transform 150ms ease-out';
      currentPanelRef.current.style.transform = 'translate3d(0px, 0, 0)';
    }
    if (neighborPanelRef.current) {
      neighborPanelRef.current.style.transition = 'transform 150ms ease-out';
    }
    const currentGeo = tabsGeometryRef.current[activeTab];
    if (currentGeo) {
      setIndicatorPosition(currentGeo.left, currentGeo.width, 'left 150ms ease-out, width 150ms ease-out');
    }
    setTimeout(() => {
      if (currentPanelRef.current) {
        currentPanelRef.current.style.transition = '';
        currentPanelRef.current.style.transform = '';
      }
      if (neighborPanelRef.current) {
        neighborPanelRef.current.style.transition = '';
        neighborPanelRef.current.style.transform = '';
      }
      setSwipeNeighbor(null);
      touchStateRef.current.isDragging = false;
      touchStateRef.current.isAnimatingRelease = false;
    }, 150);
  }, [activeTab, setIndicatorPosition]);

  // Attachement des écouteurs tactiles natifs avec { passive: false } sur le conteneur de contenu
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const onStart = (e) => handleTouchStart(e);
    const onMove = (e) => handleTouchMove(e);
    const onEnd = () => handleTouchEnd();
    const onCancel = () => handleTouchCancel();

    container.addEventListener('touchstart', onStart, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onEnd, { passive: true });
    container.addEventListener('touchcancel', onCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onStart);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', onEnd);
      container.removeEventListener('touchcancel', onCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

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
              <button
                type="button"
                data-no-swipe="true"
                aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                aria-pressed={isFav}
                title={isFav ? "Retirer des favoris" : "Ajouter aux favoris (À classer)"}
                onClick={() => toggleMatchFavorite(match, [], { sessionId: sessionId || match.session_id })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border shrink-0 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  isFav
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs ring-1 ring-amber-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Star size={14} className={isFav ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]' : ''} />
                <span>{isFav ? 'FAVORI' : 'FAVORI'}</span>
              </button>

              {isFav && (
                <button
                  type="button"
                  data-no-swipe="true"
                  aria-label="Gérer les groupes de cette rencontre"
                  title="Organiser dans les groupes personnalisés"
                  onClick={() => setGroupModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border shrink-0 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <FolderPlus size={14} className="text-amber-500" />
                  <span>{dashboardGroupLabel}</span>
                </button>
              )}

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

          {/* MOBILE (< 768px) : Disposition Centrée avec Heure/Date au milieu */}
          <div className="flex flex-col gap-1.5 md:hidden min-w-0">
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
                <button
                  type="button"
                  data-no-swipe="true"
                  aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                  aria-pressed={isFav}
                  title={isFav ? "Retirer des favoris" : "Ajouter aux favoris (À classer)"}
                  onClick={() => toggleMatchFavorite(match, [], { sessionId: sessionId || match.session_id })}
                  className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all border shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    isFav
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Star size={15} className={isFav ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]' : ''} />
                </button>

                {isFav && (
                  <button
                    type="button"
                    data-no-swipe="true"
                    aria-label="Gérer les groupes du match"
                    title="Organiser dans les groupes personnalisés"
                    onClick={() => setGroupModalOpen(true)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all border shrink-0 bg-slate-100 dark:bg-slate-800 text-amber-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 relative"
                  >
                    <FolderPlus size={15} />
                    {groupCount > 0 && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-amber-500 text-slate-950 text-[9px] font-bold rounded-full flex items-center justify-center">
                        {groupCount}
                      </span>
                    )}
                  </button>
                )}

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

            {/* Étage 2 Mobile : Confrontation Centrale Symétrique (Logos 32-36px + Horodatage Centré) */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 max-w-sm mx-auto w-full py-0.5">
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
                  className="mt-1 font-sans font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2 break-words max-w-[110px] xs:max-w-[130px] tracking-tight"
                >
                  {homeName}
                </span>
              </div>

              {/* Bloc Horaire Centré ou Fallback VS */}
              <div className="flex flex-col items-center justify-center text-center shrink-0 px-0.5 min-w-[65px]">
                {schedule.hasSchedule ? (
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    {schedule.time && (
                      <span className="font-mono font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400 leading-none">
                        {schedule.time}
                      </span>
                    )}
                    {(schedule.shortDate || schedule.dateLong) && (
                      <span className="font-mono text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                        {schedule.shortDate || schedule.dateLong}
                      </span>
                    )}
                    {schedule.isLive && (
                      <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded-full text-[8px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        LIVE
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    VS
                  </div>
                )}
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
                  className="mt-1 font-sans font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2 break-words max-w-[110px] xs:max-w-[130px] tracking-tight"
                >
                  {awayName}
                </span>
              </div>
            </div>
          </div>

          {/* TABLETTE (768px à 1023px) : Reproduction à l'identique du header d'origine */}
          <div className="hidden md:flex lg:hidden flex-col gap-1.5 min-w-0">
            {/* Étage 1 Tablettes : Retour + Ligue/Journée + Badges */}
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

              {/* Badges Tablettes */}
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

            {/* Étage 2 Tablettes : Confrontation Centrale Symétrique (Logos 32-36px + Noms Lisibles) */}
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

            {/* Étage 3 Tablettes : Date et Heure (Partie inférieure du header d'origine) */}
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
              role="tablist"
              aria-label="Onglets d'analyse de match"
              className="relative flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth px-0.5 flex-1 min-w-0"
            >
              {/* Underline visuel d'onglet actif dynamique sur mobile uniquement (style SofaScore) */}
              <div
                ref={tabIndicatorRef}
                className="md:hidden absolute bottom-0 h-0.5 bg-slate-900 dark:bg-white pointer-events-none z-10 rounded-full"
                aria-hidden="true"
                style={{ left: 0, width: 0 }}
              />

              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    aria-selected={isActive}
                    role="tab"
                    className={`
                      group relative z-10 flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-lg font-mono text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors duration-150 select-none shrink-0
                      ${isActive
                        ? 'text-slate-900 dark:text-white font-black md:bg-slate-900 md:text-white md:dark:bg-white md:dark:text-slate-950 shadow-2xs md:shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-semibold'}
                    `}
                  >
                    <span className={`transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400 md:text-emerald-400 md:dark:text-emerald-600' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
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

      {/* Tab Content with Directional Horizontal Sliding Panels & Interactive Mobile Touch Drag */}
      <div
        ref={contentContainerRef}
        data-testid="tab-content-container"
        className="mt-4 relative overflow-hidden w-full select-none"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Panneau voisin interactif (Mobile swipe suivi au doigt en temps réel) */}
        {swipeNeighbor && (
          <div
            ref={neighborPanelRef}
            aria-hidden="true"
            className="w-full absolute top-0 left-0 z-0 bg-slate-50 dark:bg-slate-950 will-change-transform"
            style={{
              transform:
                swipeNeighbor.direction === 'next'
                  ? 'translate3d(100%, 0, 0)'
                  : 'translate3d(-100%, 0, 0)',
            }}
          >
            {renderTabContent(swipeNeighbor.id)}
          </div>
        )}

        {/* Panneau sortant lors d'un clic direct programmatique sur mobile */}
        {!swipeNeighbor && isTransitioning && outgoingTab && (
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

        {/* Panneau actif courant */}
        <div
          ref={currentPanelRef}
          key={`incoming-${activeTab}`}
          className={`w-full relative z-10 bg-slate-50 dark:bg-slate-950 will-change-transform ${
            !swipeNeighbor && isTransitioning
              ? slideDirection === 'forward'
                ? 'animate-tab-slide-in-right'
                : 'animate-tab-slide-in-left'
              : ''
          }`}
          style={!swipeNeighbor && isTransitioning ? undefined : { transform: 'translate3d(0px, 0, 0)' }}
        >
          {renderTabContent(activeTab)}
        </div>
      </div>

      {/* Boîte de dialogue de gestion des groupes pour cette rencontre */}
      {groupModalOpen && (
        <GroupManagerModal
          isOpen={groupModalOpen}
          onClose={() => setGroupModalOpen(false)}
          match={match}
        />
      )}
    </div>
  );
}
