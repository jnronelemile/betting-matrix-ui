import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import {
  Crosshair,
  Target,
  Layers,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  BarChart3,
  Ban,
  Activity,
  Info,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { TeamLogo } from '../../utils/teamLogos';

/**
 * Présentation typographique et sémantique du statut opérationnel TITANIUM.
 * Valeurs sources exactes préservées pour les détails techniques.
 */
export const getOperationalStatusMeta = (status) => {
  switch (status) {
    case 'ACTIONABLE_PRODUCTION':
      return {
        label: 'Production',
        raw: 'ACTIONABLE_PRODUCTION',
        description: 'Calcul algorithmique validé en production',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
        isActionable: true,
      };
    case 'INFORMATIONAL_ONLY':
      return {
        label: 'Informatif',
        raw: 'INFORMATIONAL_ONLY',
        description: 'Calcul indicatif réservé à l’analyse (non qualifié pour l’aval)',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
        isActionable: false,
      };
    default:
      return {
        label: status || 'Non spécifié',
        raw: status || 'UNSPECIFIED',
        description: 'Statut opérationnel non spécifié',
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
        isActionable: null,
      };
  }
};

/**
 * Présentation typographique et sémantique de la couverture bookmaker présumée TITANIUM.
 * Valeurs sources exactes préservées pour les détails techniques.
 */
export const getBookmakerCoverageMeta = (coverage) => {
  switch (coverage) {
    case 'PRESUMED_AVAILABLE':
      return {
        label: 'Présumée disponible',
        raw: 'PRESUMED_AVAILABLE',
        description: 'Offre bookmaker standard présumée (sans vérification temps réel)',
        badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
      };
    case 'LIMITED_OR_UNKNOWN':
      return {
        label: 'Limitée / Inconnue',
        raw: 'LIMITED_OR_UNKNOWN',
        description: 'Disponibilité restreinte ou variable selon les opérateurs',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
      };
    case 'SPECIALIST_ONLY':
      return {
        label: 'Spécialistes uniquement',
        raw: 'SPECIALIST_ONLY',
        description: 'Disponible uniquement chez certains bookmakers spécialisés',
        badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
      };
    default:
      return {
        label: coverage || 'Non renseignée',
        raw: coverage || 'UNSPECIFIED',
        description: 'Couverture bookmaker non renseignée',
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
      };
  }
};

import { getThreeClosestLines, getNearestLine } from '../../utils/titaniumLoader';

export { getThreeClosestLines, getNearestLine };

const DISCIPLINE_KEYS = ['corners', 'sot', 'shots', 'throws'];

export default function TabTactical({ match, onNavigateTab }) {
  const [showCoverageDetails, setShowCoverageDetails] = useState(false);
  const [expandedCardNotes, setExpandedCardNotes] = useState({});
  const [selectedDiscipline, setSelectedDiscipline] = useState('corners'); // 'corners' | 'sot' | 'shots' | 'throws'
  const [expandedHomeCatalogue, setExpandedHomeCatalogue] = useState(false);
  const [expandedAwayCatalogue, setExpandedAwayCatalogue] = useState(false);

  // Détection dynamique et réactive du viewport Desktop (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => setIsDesktop(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
    } else {
      mql.addListener(onChange);
    }
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', onChange);
      } else {
        mql.removeListener(onChange);
      }
    };
  }, []);

  // État et refs pour le sous-swipe tactile interactif au pixel près et synchronisation du sélecteur
  const [subSwipeNeighbor, setSubSwipeNeighbor] = useState(null); // { id: string, direction: 'next' | 'prev' } | null
  const pillsContainerRef = useRef(null);
  const pillRefs = useRef({});
  const subSwipeContainerRef = useRef(null);
  const subCurrentPanelRef = useRef(null);
  const subNeighborPanelRef = useRef(null);
  const subFinishTimeoutRef = useRef(null);

  const subTouchRef = useRef({
    startX: 0,
    startY: 0,
    currentDx: 0,
    startTime: 0,
    isTracking: false,
    isDragging: false,
    isVerticalScroll: false,
    direction: null,
    neighborDisciplineKey: null,
    containerWidth: 0,
    isAnimatingRelease: false,
    prefersReducedMotion: false,
  });

  const risk = match.Risk_Management_Context || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const anchors = risk.League_Anchors || {};
  const killSwitchDiag = risk.Kill_Switch_Diagnostics || {};
  const props = match.Prop_Bets || {};
  const probs = match.True_Probabilities || {};
  const diag = match.Calibration_Diagnostics || {};
  const investSignals = risk.Investment_Signals || {};
  const operational = risk.Operational_Restrictions || {};
  const blockedMarkets = operational.blocked_markets || [];

  const coverageNotice = match.Market_Coverage_Notice && typeof match.Market_Coverage_Notice === 'object'
    ? match.Market_Coverage_Notice
    : null;
  const coverageMarkets = coverageNotice?.markets && typeof coverageNotice.markets === 'object'
    ? coverageNotice.markets
    : null;

  const isKillSwitchActive = investSignals.IS_KILL_SWITCH_ACTIVE ||
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));

  // Proposition markets canonical priority order: Corners -> SOT -> Shots -> Throws
  const PROPOSITION_ORDER = [
    'PROP_HOME_MORE_CORNERS',
    'PROP_HOME_MORE_SOT',
    'PROP_HOME_MORE_SHOTS',
    'PROP_HOME_MORE_THROWS',
  ];

  const propBetsKeys = Object.keys(props)
    .filter(k => k.startsWith('PROP_HOME_MORE_'))
    .sort((a, b) => {
      const idxA = PROPOSITION_ORDER.indexOf(a);
      const idxB = PROPOSITION_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

  // Configurations des 4 disciplines statistiques (Ordre canonique strict)
  const statisticalMarkets = [
    {
      key: 'corners',
      label: 'Corners',
      shortLabel: 'Corners',
      marketType: 'TEAM_CORNERS',
      refKey: 'median_corners',
      refType: 'Médiane ligue (Match)',
      shortRefType: 'Méd. Match',
      propKey: 'PROB_OVER_MEDIAN_CORNERS',
      lambdaKey: 'LAMBDA_CORNERS_MATCH',
      propMoreKey: 'PROP_HOME_MORE_CORNERS'
    },
    {
      key: 'sot',
      label: 'Shots on Target',
      shortLabel: 'Cadrés',
      marketType: 'TEAM_SOT',
      refKey: 'median_sot',
      refType: 'Médiane ligue (Match)',
      shortRefType: 'Méd. Match',
      propKey: 'PROB_OVER_MEDIAN_SOT',
      lambdaKey: 'LAMBDA_SOT_MATCH',
      propMoreKey: 'PROP_HOME_MORE_SOT'
    },
    {
      key: 'shots',
      label: 'Shots',
      shortLabel: 'Tirs',
      marketType: 'TEAM_SHOTS',
      refKey: 'median_shots',
      refType: 'Médiane ligue (Match)',
      shortRefType: 'Méd. Match',
      propKey: 'PROB_OVER_MEDIAN_SHOTS',
      lambdaKey: 'LAMBDA_SHOTS_MATCH',
      propMoreKey: 'PROP_HOME_MORE_SHOTS'
    },
    {
      key: 'throws',
      label: 'Throws',
      shortLabel: 'Touches',
      marketType: 'TEAM_THROWS',
      refKey: 'mean_throws',
      refType: 'Moyenne ligue (par équipe)',
      shortRefType: 'Moy. Équipe',
      propKey: 'PROB_OVER_MEDIAN_THROWS',
      lambdaKey: 'LAMBDA_THROWS_MATCH',
      propMoreKey: 'PROP_HOME_MORE_THROWS'
    },
  ];

  const currentMarketMeta = statisticalMarkets.find(m => m.key === selectedDiscipline) || statisticalMarkets[0];

  // Extraction déterministe de la famille Team_Stat_Markets active
  const currentFamily = useMemo(() => {
    const families = match.Team_Stat_Markets?.Families;
    if (!Array.isArray(families)) return null;
    return families.find(f => f.Market_Type === currentMarketMeta.marketType) || null;
  }, [match.Team_Stat_Markets, currentMarketMeta.marketType]);

  const coverageSummary = useMemo(() => {
    if (!coverageMarkets) return null;
    const entries = Object.entries(coverageMarkets).filter(([, v]) => v && typeof v === 'object');
    if (entries.length === 0) return null;

    let actionableCount = 0;
    let informationalCount = 0;
    const notesList = [];

    entries.forEach(([mKey, mVal]) => {
      const op = getOperationalStatusMeta(mVal.operational_status);
      const cov = getBookmakerCoverageMeta(mVal.bookmaker_coverage);
      if (op.isActionable === true) actionableCount++;
      else if (op.isActionable === false) informationalCount++;
      if (mVal.notes) {
        notesList.push({ marketKey: mKey, note: mVal.notes, opMeta: op, covMeta: cov });
      }
    });

    return {
      total: entries.length,
      actionableCount,
      informationalCount,
      notesList,
    };
  }, [coverageMarkets]);

  // Recentrage horizontal automatique et fluide de la discipline active dans la barre de sous-onglets
  const centerActivePill = useCallback((disciplineKey, behavior = 'smooth') => {
    const container = pillsContainerRef.current;
    if (!container) return;
    const button = pillRefs.current[disciplineKey];
    if (!button) return;

    // Calcul du scrollLeft pour centrer exactement le bouton dans le conteneur
    const targetScrollLeft = button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2;

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: (prefersReducedMotion || behavior === 'instant') ? 'instant' : 'smooth'
    });
  }, []);

  // Synchronisation du recentrage horizontal dès que la discipline active change (par clic ou sous-swipe)
  useEffect(() => {
    centerActivePill(selectedDiscipline);
  }, [selectedDiscipline, centerActivePill]);

  // Recentrage initial et au redimensionnement sans défilement vertical involontaire
  useEffect(() => {
    centerActivePill(selectedDiscipline, 'instant');
    const handleResize = () => {
      centerActivePill(selectedDiscipline, 'instant');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedDiscipline, centerActivePill]);

  // Nettoyage des timers lors du démontage
  useEffect(() => {
    return () => {
      if (subFinishTimeoutRef.current) {
        clearTimeout(subFinishTimeoutRef.current);
      }
    };
  }, []);

  // Sécurisation au passage sur Desktop (>= 1024px) : purger tout état de transition ou sous-swipe résiduel
  useEffect(() => {
    if (isDesktop) {
      if (subFinishTimeoutRef.current) {
        clearTimeout(subFinishTimeoutRef.current);
        subFinishTimeoutRef.current = null;
      }
      if (subCurrentPanelRef.current) {
        subCurrentPanelRef.current.style.transition = '';
        subCurrentPanelRef.current.style.transform = '';
      }
      if (subNeighborPanelRef.current) {
        subNeighborPanelRef.current.style.transition = '';
        subNeighborPanelRef.current.style.transform = '';
      }
      if (subSwipeContainerRef.current) {
        subSwipeContainerRef.current.style.minHeight = '';
      }
      setSubSwipeNeighbor(null);
      subTouchRef.current.isDragging = false;
      subTouchRef.current.isAnimatingRelease = false;
      subTouchRef.current.isTracking = false;
    }
  }, [isDesktop]);

  // Verrouillage de la hauteur minimale pendant le swipe pour éviter les sauts brusques de hauteur
  useEffect(() => {
    if (subSwipeNeighbor && subCurrentPanelRef.current && subNeighborPanelRef.current && subSwipeContainerRef.current) {
      const currentH = subCurrentPanelRef.current.offsetHeight;
      const neighborH = subNeighborPanelRef.current.offsetHeight;
      if (currentH > 0 || neighborH > 0) {
        subSwipeContainerRef.current.style.minHeight = `${Math.max(currentH, neighborH)}px`;
      }
    } else if (!subSwipeNeighbor && subSwipeContainerRef.current && !subTouchRef.current.isAnimatingRelease) {
      subSwipeContainerRef.current.style.minHeight = '';
    }
  }, [subSwipeNeighbor]);

  const handleSelectDiscipline = useCallback((key) => {
    if (subFinishTimeoutRef.current) {
      clearTimeout(subFinishTimeoutRef.current);
      subFinishTimeoutRef.current = null;
    }
    if (subCurrentPanelRef.current) {
      subCurrentPanelRef.current.style.transition = '';
      subCurrentPanelRef.current.style.transform = '';
    }
    if (subNeighborPanelRef.current) {
      subNeighborPanelRef.current.style.transition = '';
      subNeighborPanelRef.current.style.transform = '';
    }
    if (subSwipeContainerRef.current) {
      subSwipeContainerRef.current.style.minHeight = '';
    }
    setSubSwipeNeighbor(null);
    subTouchRef.current.isDragging = false;
    subTouchRef.current.isAnimatingRelease = false;
    subTouchRef.current.isTracking = false;

    setSelectedDiscipline(key);
    setExpandedHomeCatalogue(false);
    setExpandedAwayCatalogue(false);
  }, []);

  // Détection des éléments interactifs où le sous-swipe tactile ne doit pas intervenir
  const isInteractiveSubTarget = (target) => {
    if (!target) return true;
    if (target.closest('[data-sub-swipe-ignore="true"]')) return true;
    if (target.closest('button, a, input, select, textarea')) return true;
    if (target.closest('.overflow-x-auto, table')) return true;
    return false;
  };

  const handleSubTouchStart = useCallback((e) => {
    subTouchRef.current.isTracking = false;
    subTouchRef.current.isDragging = false;
    subTouchRef.current.isVerticalScroll = false;

    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return;
    if (!e.touches || e.touches.length !== 1) return;
    if (subTouchRef.current.isAnimatingRelease) return;
    if (isInteractiveSubTarget(e.target)) return;

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const touch = e.touches[0];
    const containerW = subSwipeContainerRef.current ? subSwipeContainerRef.current.offsetWidth : (window.innerWidth || 390);

    subTouchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentDx: 0,
      startTime: Date.now(),
      isTracking: true,
      isDragging: false,
      isVerticalScroll: false,
      direction: null,
      neighborDisciplineKey: null,
      containerWidth: containerW,
      isAnimatingRelease: false,
      prefersReducedMotion,
    };
  }, []);

  const handleSubTouchMove = useCallback((e) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return;
    if (!subTouchRef.current.isTracking) return;
    if (!e.touches || e.touches.length === 0) return;
    if (subTouchRef.current.isAnimatingRelease) return;
    if (subTouchRef.current.isVerticalScroll) return;

    const touch = e.touches[0];
    const dx = touch.clientX - subTouchRef.current.startX;
    const dy = touch.clientY - subTouchRef.current.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Phase 1 : Détermination stricte de l'intention (Scroll vertical vs Sous-swipe horizontal)
    if (!subTouchRef.current.isDragging) {
      if (absY > absX && absY > 7) {
        // Défilement vertical naturel : priorité absolue
        subTouchRef.current.isVerticalScroll = true;
        return;
      }
      if (absX > 10 && absX > absY * 1.15) {
        subTouchRef.current.isDragging = true;
      } else {
        return;
      }
    }

    // Phase 2 : En cours de glissement horizontal piloté par le doigt
    if (subTouchRef.current.isDragging) {
      if (e.cancelable) e.preventDefault();

      const curIdx = DISCIPLINE_KEYS.indexOf(selectedDiscipline);
      const direction = dx < 0 ? 'next' : 'prev';
      let neighborKey = null;

      if (direction === 'next') {
        if (curIdx < DISCIPLINE_KEYS.length - 1) {
          neighborKey = DISCIPLINE_KEYS[curIdx + 1];
        }
      } else {
        if (curIdx > 0) {
          neighborKey = DISCIPLINE_KEYS[curIdx - 1];
        }
      }

      // Résistance élastique aux deux extrémités (Corners à gauche, Throws à droite)
      let effectiveDx = dx;
      if (!neighborKey) {
        effectiveDx = dx * 0.15;
      }

      // Montage / bascule dynamique du panneau voisin
      if (neighborKey) {
        if (!subSwipeNeighbor || subSwipeNeighbor.id !== neighborKey || subSwipeNeighbor.direction !== direction) {
          setSubSwipeNeighbor({ id: neighborKey, direction });
        }
      } else if (subSwipeNeighbor) {
        setSubSwipeNeighbor(null);
      }

      subTouchRef.current.currentDx = effectiveDx;
      subTouchRef.current.direction = direction;
      subTouchRef.current.neighborDisciplineKey = neighborKey;

      if (subTouchRef.current.prefersReducedMotion) {
        return;
      }

      // Translation GPU directe en temps réel synchronisée avec le doigt (zéro re-render)
      const containerW = subTouchRef.current.containerWidth || 390;
      if (subCurrentPanelRef.current) {
        subCurrentPanelRef.current.style.transition = 'none';
        subCurrentPanelRef.current.style.transform = `translate3d(${effectiveDx}px, 0, 0)`;
      }
      if (subNeighborPanelRef.current && neighborKey) {
        const neighborOffset = direction === 'next' ? containerW + effectiveDx : -containerW + effectiveDx;
        subNeighborPanelRef.current.style.transition = 'none';
        subNeighborPanelRef.current.style.transform = `translate3d(${neighborOffset}px, 0, 0)`;
      }
    }
  }, [selectedDiscipline, subSwipeNeighbor]);

  const handleSubTouchEnd = useCallback(() => {
    if (!subTouchRef.current.isTracking) return;
    subTouchRef.current.isTracking = false;

    if (!subTouchRef.current.isDragging) {
      subTouchRef.current.isDragging = false;
      subTouchRef.current.isVerticalScroll = false;
      return;
    }

    const { currentDx, containerWidth, startTime, direction, neighborDisciplineKey, prefersReducedMotion } = subTouchRef.current;
    const containerW = containerWidth || 390;
    const dt = Date.now() - startTime;
    const velocity = dt > 0 ? currentDx / dt : 0;

    let shouldCommit = false;
    if (neighborDisciplineKey) {
      if (direction === 'next') {
        shouldCommit = (currentDx < -containerW * 0.22) || (velocity < -0.32 && currentDx < -25);
      } else if (direction === 'prev') {
        shouldCommit = (currentDx > containerW * 0.22) || (velocity > 0.32 && currentDx > 25);
      }
    }

    subTouchRef.current.isAnimatingRelease = true;

    if (shouldCommit && neighborDisciplineKey) {
      // Recentrage anticipé et fluide de la discipline cible dans le sélecteur
      centerActivePill(neighborDisciplineKey, prefersReducedMotion ? 'instant' : 'smooth');

      if (prefersReducedMotion) {
        if (subCurrentPanelRef.current) {
          subCurrentPanelRef.current.style.transition = '';
          subCurrentPanelRef.current.style.transform = '';
        }
        if (subNeighborPanelRef.current) {
          subNeighborPanelRef.current.style.transition = '';
          subNeighborPanelRef.current.style.transform = '';
        }
        setSelectedDiscipline(neighborDisciplineKey);
        setSubSwipeNeighbor(null);
        setExpandedHomeCatalogue(false);
        setExpandedAwayCatalogue(false);
        subTouchRef.current.isDragging = false;
        subTouchRef.current.isAnimatingRelease = false;
        return;
      }

      const duration = 220;
      const ease = 'cubic-bezier(0.2, 0.9, 0.3, 1)';
      const targetCurrent = direction === 'next' ? -containerW : containerW;

      if (subCurrentPanelRef.current) {
        subCurrentPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        subCurrentPanelRef.current.style.transform = `translate3d(${targetCurrent}px, 0, 0)`;
      }
      if (subNeighborPanelRef.current) {
        subNeighborPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        subNeighborPanelRef.current.style.transform = 'translate3d(0px, 0, 0)';
      }

      subFinishTimeoutRef.current = setTimeout(() => {
        if (subCurrentPanelRef.current) {
          subCurrentPanelRef.current.style.transition = '';
          subCurrentPanelRef.current.style.transform = '';
        }
        if (subNeighborPanelRef.current) {
          subNeighborPanelRef.current.style.transition = '';
          subNeighborPanelRef.current.style.transform = '';
        }
        if (subSwipeContainerRef.current) {
          subSwipeContainerRef.current.style.minHeight = '';
        }
        setSelectedDiscipline(neighborDisciplineKey);
        setSubSwipeNeighbor(null);
        setExpandedHomeCatalogue(false);
        setExpandedAwayCatalogue(false);
        subTouchRef.current.isDragging = false;
        subTouchRef.current.isAnimatingRelease = false;
        subFinishTimeoutRef.current = null;
      }, duration);
    } else {
      // Annulation : retour amorti à la position d'origine
      centerActivePill(selectedDiscipline, prefersReducedMotion ? 'instant' : 'smooth');

      if (prefersReducedMotion) {
        if (subCurrentPanelRef.current) {
          subCurrentPanelRef.current.style.transition = '';
          subCurrentPanelRef.current.style.transform = '';
        }
        if (subNeighborPanelRef.current) {
          subNeighborPanelRef.current.style.transition = '';
          subNeighborPanelRef.current.style.transform = '';
        }
        setSubSwipeNeighbor(null);
        subTouchRef.current.isDragging = false;
        subTouchRef.current.isAnimatingRelease = false;
        return;
      }

      const duration = 200;
      const ease = 'cubic-bezier(0.2, 0.9, 0.3, 1)';

      if (subCurrentPanelRef.current) {
        subCurrentPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        subCurrentPanelRef.current.style.transform = 'translate3d(0px, 0, 0)';
      }
      if (subNeighborPanelRef.current && neighborDisciplineKey) {
        const targetNeighbor = direction === 'next' ? containerW : -containerW;
        subNeighborPanelRef.current.style.transition = `transform ${duration}ms ${ease}`;
        subNeighborPanelRef.current.style.transform = `translate3d(${targetNeighbor}px, 0, 0)`;
      }

      subFinishTimeoutRef.current = setTimeout(() => {
        if (subCurrentPanelRef.current) {
          subCurrentPanelRef.current.style.transition = '';
          subCurrentPanelRef.current.style.transform = '';
        }
        if (subNeighborPanelRef.current) {
          subNeighborPanelRef.current.style.transition = '';
          subNeighborPanelRef.current.style.transform = '';
        }
        if (subSwipeContainerRef.current) {
          subSwipeContainerRef.current.style.minHeight = '';
        }
        setSubSwipeNeighbor(null);
        subTouchRef.current.isDragging = false;
        subTouchRef.current.isAnimatingRelease = false;
        subFinishTimeoutRef.current = null;
      }, duration);
    }
  }, [selectedDiscipline, centerActivePill]);

  const handleSubTouchCancel = useCallback(() => {
    if (!subTouchRef.current.isTracking) return;
    subTouchRef.current.isTracking = false;
    subTouchRef.current.isDragging = false;
    subTouchRef.current.isVerticalScroll = false;
    if (subCurrentPanelRef.current) {
      subCurrentPanelRef.current.style.transition = '';
      subCurrentPanelRef.current.style.transform = '';
    }
    if (subNeighborPanelRef.current) {
      subNeighborPanelRef.current.style.transition = '';
      subNeighborPanelRef.current.style.transform = '';
    }
    if (subSwipeContainerRef.current) {
      subSwipeContainerRef.current.style.minHeight = '';
    }
    setSubSwipeNeighbor(null);
  }, []);

  const toggleCardNote = (key) => {
    setExpandedCardNotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getPropColor = (val) => {
    if (val >= 0.70) return 'bg-emerald-500';
    if (val >= 0.50) return 'bg-amber-500';
    return 'bg-slate-600';
  };

  const getPropTextColor = (val) => {
    if (val >= 0.70) return 'text-emerald-600 dark:text-emerald-400';
    if (val >= 0.50) return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-500 dark:text-slate-400';
  };

  // Noms d'équipes et logos
  const homeTeamName = match.displayHome || match.shortHome || match.Matchup?.split(' vs ')?.[0] || 'Domicile';
  const awayTeamName = match.displayAway || match.shortAway || match.Matchup?.split(' vs ')?.[1] || 'Extérieur';
  const homeLogoTeam = match.shortHome || match.displayHome || homeTeamName;
  const awayLogoTeam = match.shortAway || match.displayAway || awayTeamName;

  // Lignes et lambdas par équipe
  const homeLines = currentFamily?.Home?.Lines || [];
  const awayLines = currentFamily?.Away?.Lines || [];
  const homeLambda = currentFamily?.Home?.Lambda;
  const awayLambda = currentFamily?.Away?.Lambda;

  const homeNearestLine = useMemo(() => getNearestLine(homeLines, homeLambda), [homeLines, homeLambda]);
  const awayNearestLine = useMemo(() => getNearestLine(awayLines, awayLambda), [awayLines, awayLambda]);

  // Catalogue complet direct sur PC (>= 1024px) ; 3 lignes pivots + extension sous 1024px
  const homeDisplayedLines = useMemo(() => {
    if (isDesktop || expandedHomeCatalogue) return homeLines;
    return getThreeClosestLines(homeLines, homeLambda);
  }, [isDesktop, expandedHomeCatalogue, homeLines, homeLambda]);

  const awayDisplayedLines = useMemo(() => {
    if (isDesktop || expandedAwayCatalogue) return awayLines;
    return getThreeClosestLines(awayLines, awayLambda);
  }, [isDesktop, expandedAwayCatalogue, awayLines, awayLambda]);

  // Rendu modulaire du panneau tripartite pour une discipline donnée (courante ou voisine de swipe)
  const renderDisciplinePanel = (disciplineKey) => {
    const isCurrent = disciplineKey === selectedDiscipline;
    const marketMeta = statisticalMarkets.find(m => m.key === disciplineKey) || statisticalMarkets[0];
    const family = isCurrent
      ? currentFamily
      : (match.Team_Stat_Markets?.Families?.find(f => f.Market_Type === marketMeta.marketType) || null);

    // Cas 1 : Archive Legacy sans Team_Stat_Markets
    if (!match.Team_Stat_Markets) {
      return (
        <div className="p-6 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <Info className="mx-auto text-slate-400" size={24} />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Marchés par équipe non disponibles pour ce match
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Ce jeu de données provient d'une session antérieure à la modélisation Poisson par équipe (V1.0). Les totaux de match et comparaisons unilatérales restent consultables ci-dessus et ci-dessous.
          </p>
        </div>
      );
    }

    // Cas 2 : Statut racine Team_Stat_Markets non CALCULATED
    if (match.Team_Stat_Markets.Status && match.Team_Stat_Markets.Status !== 'CALCULATED') {
      return (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle size={16} />
            <span>Marchés par équipe suspendus ({match.Team_Stat_Markets.Status})</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Motif rapporté par le moteur : {match.Team_Stat_Markets.Reason || 'Calcul suspendu par le moteur pour ce match.'}
          </p>
        </div>
      );
    }

    // Cas 3 : Famille absente du catalogue pour cette discipline
    if (!family) {
      const isV1_0_Throws = disciplineKey === 'throws' && String(match.Team_Stat_Markets.Schema_Version || match.Team_Stat_Markets.Catalogue_Version) === '1.0';
      return (
        <div className="p-6 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <Info className="mx-auto text-slate-400" size={24} />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isV1_0_Throws
              ? 'Touches (Throws) non intégrées dans le catalogue V1.0'
              : `Discipline ${marketMeta.label} non exportée dans ce payload`}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isV1_0_Throws
              ? 'Le catalogue V1.0 intègre Corners, Cadrés et Tirs. La discipline Touches est disponible à partir des jeux de données V1.1.'
              : `La famille ${marketMeta.marketType} n'est pas présente dans le contrat Team_Stat_Markets de ce match.`}
          </p>
          {Number.isFinite(props[marketMeta.lambdaKey]) && (
            <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400">
              Total match préliminaire : λ = {props[marketMeta.lambdaKey].toFixed(2)}
            </div>
          )}
        </div>
      );
    }

    // Cas 4 : Famille présente mais statut non CALCULATED ou Home/Away incomplets
    if (family.Status !== 'CALCULATED' || !family.Home || !family.Away) {
      return (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle size={16} />
            <span>Calcul suspendu pour {marketMeta.label} ({family?.Status || 'NON_CALCULÉ'})</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Motif rapporté par le moteur : {family?.Reason || 'Données volumétriques ou historiques insuffisantes pour cette discipline.'}
          </p>
        </div>
      );
    }

    // Données spécifiques à la discipline
    const panelHomeLines = isCurrent ? homeLines : (family?.Home?.Lines || []);
    const panelAwayLines = isCurrent ? awayLines : (family?.Away?.Lines || []);
    const panelHomeLambda = isCurrent ? homeLambda : family?.Home?.Lambda;
    const panelAwayLambda = isCurrent ? awayLambda : family?.Away?.Lambda;
    const panelHomeNearestLine = isCurrent ? homeNearestLine : getNearestLine(panelHomeLines, panelHomeLambda);
    const panelAwayNearestLine = isCurrent ? awayNearestLine : getNearestLine(panelAwayLines, panelAwayLambda);
    const panelHomeDisplayedLines = isCurrent
      ? homeDisplayedLines
      : (isDesktop ? panelHomeLines : getThreeClosestLines(panelHomeLines, panelHomeLambda));
    const panelAwayDisplayedLines = isCurrent
      ? awayDisplayedLines
      : (isDesktop ? panelAwayLines : getThreeClosestLines(panelAwayLines, panelAwayLambda));

    const linesForHome = panelHomeLines;
    const linesForAway = panelAwayLines;

    // Cas 5 : Calcul nominal (CALCULATED) — Rendu Tripartite Home / Match Total / Away
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_1fr] gap-4 items-start">
        {/* 1. Pilier Domicile (Home) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <TeamLogo team={homeLogoTeam} league={match.League} size="sm" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate" title={homeTeamName}>
                  {homeTeamName}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Domicile
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">
                λ Attendu
              </span>
              <span className="font-mono text-lg font-black text-slate-900 dark:text-slate-100">
                {Number.isFinite(panelHomeLambda) ? panelHomeLambda.toFixed(2) : '-'}
              </span>
            </div>
          </div>

          {/* Table Over/Under Domicile */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Lignes Over / Under</span>
              <span className="font-mono text-[9px] text-slate-400">Dist. Poisson</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] text-slate-400 uppercase">
                    <th className="py-1 text-left font-semibold">Seuil</th>
                    <th className="py-1 text-right font-semibold">Over</th>
                    <th className="py-1 text-right font-semibold">Under</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {panelHomeDisplayedLines.map((line) => {
                    const isNearest = line.Line === panelHomeNearestLine;
                    return (
                      <tr
                        key={line.Line}
                        className={`transition-colors ${
                          isNearest
                            ? 'bg-blue-50/60 dark:bg-blue-950/40 font-bold'
                            : 'hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="py-1.5 text-left text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span>&gt; {line.Line}</span>
                            {isNearest && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight">
                                Pivot
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-1.5 text-right ${Number.isFinite(line.Probability_Over) ? getPropTextColor(line.Probability_Over) : 'text-slate-400'}`}>
                          {Number.isFinite(line.Probability_Over) ? `${(line.Probability_Over * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">
                          {Number.isFinite(line.Probability_Under) ? `${(line.Probability_Under * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bouton d'extension du catalogue complet (Mobile / Tablettes < 1024px uniquement) */}
            {!isDesktop && homeLines.length > 3 && isCurrent && (
              <button
                type="button"
                onClick={() => setExpandedHomeCatalogue(prev => !prev)}
                className="w-full py-1.5 px-2 mt-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                {expandedHomeCatalogue ? (
                  <>
                    <Minimize2 size={11} />
                    <span>Réduire aux 3 lignes pivots{Number.isFinite(panelHomeLambda) ? ` (λ = ${panelHomeLambda.toFixed(2)})` : ''}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 size={11} />
                    <span>Afficher le catalogue complet ({linesForHome.length} lignes)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 2. Pilier Central : Match Total & Contexte Ligue (order-first sur mobile pour synthèse immédiate avec accentuation visuelle) */}
        <div className="order-first lg:order-none p-4 rounded-2xl bg-gradient-to-b from-blue-50/40 to-white dark:from-blue-950/20 dark:to-slate-900 border-2 border-blue-500/30 dark:border-blue-500/40 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Total du Match
              </span>
            </div>
            <Badge variant="info" className="text-[9px] font-mono font-bold">
              {marketMeta.shortLabel}
            </Badge>
          </div>

          {/* Somme additive exacte */}
          <div className="text-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">
              λ Total Match
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 dark:text-slate-100">
              {Number.isFinite(family?.Match_Total_Lambda)
                ? family.Match_Total_Lambda.toFixed(2)
                : (Number.isFinite(props[marketMeta.lambdaKey]) ? props[marketMeta.lambdaKey].toFixed(2) : '-')}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 block">
              {Number.isFinite(panelHomeLambda) ? panelHomeLambda.toFixed(2) : '-'} (H) + {Number.isFinite(panelAwayLambda) ? panelAwayLambda.toFixed(2) : '-'} (A)
            </span>
          </div>

          {/* Repère de ligue & Probabilité supérieure au seuil */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 text-[11px] truncate" title={marketMeta.refType}>
                {marketMeta.refType}
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                {Number.isFinite(anchors[marketMeta.refKey]) ? anchors[marketMeta.refKey].toFixed(2) : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-slate-500 text-[11px] truncate">
                {disciplineKey === 'throws' ? 'Prob > Seuil match dérivé' : 'Prob > Réf ligue'}
              </span>
              <span className={`font-mono font-bold shrink-0 ${getPropTextColor(props[marketMeta.propKey] || 0)}`}>
                {Number.isFinite(props[marketMeta.propKey])
                  ? `${(props[marketMeta.propKey] * 100).toFixed(1)}%`
                  : '-'}
              </span>
            </div>

            {/* Domination unilatérale Domicile > Extérieur */}
            {Number.isFinite(props[marketMeta.propMoreKey]) && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    P(Domination Domicile) :
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {(props[marketMeta.propMoreKey] * 100).toFixed(1)}%
                  </span>
                </div>
                <ProgressBar
                  value={props[marketMeta.propMoreKey]}
                  max={1}
                  colorClass={getPropColor(props[marketMeta.propMoreKey])}
                  displayValue=" "
                />
              </div>
            )}
          </div>

          <p className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center">
            {disciplineKey === 'throws'
              ? '* La référence de ligue (mean_throws) est une moyenne par équipe, tandis que le seuil Over évalue le volume global du match.'
              : '* Médiane globale calculée sur l’ensemble des matchs de la compétition.'}
          </p>
        </div>

        {/* 3. Pilier Extérieur (Away) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <TeamLogo team={awayLogoTeam} league={match.League} size="sm" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate" title={awayTeamName}>
                  {awayTeamName}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  Extérieur
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">
                λ Attendu
              </span>
              <span className="font-mono text-lg font-black text-slate-900 dark:text-slate-100">
                {Number.isFinite(panelAwayLambda) ? panelAwayLambda.toFixed(2) : '-'}
              </span>
            </div>
          </div>

          {/* Table Over/Under Extérieur */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Lignes Over / Under</span>
              <span className="font-mono text-[9px] text-slate-400">Dist. Poisson</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] text-slate-400 uppercase">
                    <th className="py-1 text-left font-semibold">Seuil</th>
                    <th className="py-1 text-right font-semibold">Over</th>
                    <th className="py-1 text-right font-semibold">Under</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {panelAwayDisplayedLines.map((line) => {
                    const isNearest = line.Line === panelAwayNearestLine;
                    return (
                      <tr
                        key={line.Line}
                        className={`transition-colors ${
                          isNearest
                            ? 'bg-blue-50/60 dark:bg-blue-950/40 font-bold'
                            : 'hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="py-1.5 text-left text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span>&gt; {line.Line}</span>
                            {isNearest && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight">
                                Pivot
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-1.5 text-right ${Number.isFinite(line.Probability_Over) ? getPropTextColor(line.Probability_Over) : 'text-slate-400'}`}>
                          {Number.isFinite(line.Probability_Over) ? `${(line.Probability_Over * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">
                          {Number.isFinite(line.Probability_Under) ? `${(line.Probability_Under * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bouton d'extension du catalogue complet (Mobile / Tablettes < 1024px uniquement) */}
            {!isDesktop && awayLines.length > 3 && isCurrent && (
              <button
                type="button"
                onClick={() => setExpandedAwayCatalogue(prev => !prev)}
                className="w-full py-1.5 px-2 mt-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                {expandedAwayCatalogue ? (
                  <>
                    <Minimize2 size={11} />
                    <span>Réduire aux 3 lignes pivots{Number.isFinite(panelAwayLambda) ? ` (λ = ${panelAwayLambda.toFixed(2)})` : ''}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 size={11} />
                    <span>Afficher le catalogue complet ({linesForAway.length} lignes)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Operational Vigilance Banner if Kill-Switch active or Blocked Markets */}
      {(isKillSwitchActive || blockedMarkets.length > 0) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Vigilance opérationnelle active
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isKillSwitchActive && 'Kill-Switch actif (probabilités 1X2 & Buts neutralisées). '}
                {blockedMarkets.length > 0 && `Marchés bloqués : ${blockedMarkets.join(', ')}.`}
              </span>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('risk')}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>Détails du risque</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Top Grid: Statistical Market Overview (Full Width / Prominent) */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <Crosshair size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Statistical Market Overview
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                Projections statistiques directes (Corners, Cadrés, Tirs, Touches) et références de ligue.
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Sélectionnez une discipline pour explorer le détail
          </span>
        </div>

        {/* Compact Market Coverage Notice Summary Banner */}
        {coverageNotice && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-2 sm:px-3 sm:py-2 transition-colors max-w-full overflow-hidden">
            {/* Collapsed state: single interactive summary row */}
            <button
              type="button"
              onClick={() => setShowCoverageDetails(prev => !prev)}
              aria-expanded={showCoverageDetails}
              className="w-full flex items-center justify-between gap-1.5 text-left select-none cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Info size={13} />
                </div>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Couverture
                </span>
                {coverageSummary && (
                  <div className="flex items-center gap-1 shrink-0 text-[10px]">
                    {coverageSummary.actionableCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25 font-medium leading-none">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        {coverageSummary.actionableCount} Prod
                      </span>
                    )}
                    {coverageSummary.informationalCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25 font-medium leading-none">
                        <span className="w-1 h-1 rounded-full bg-amber-500" />
                        {coverageSummary.informationalCount} Info
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 shrink-0 transition-colors">
                <span className="hidden xs:inline sm:inline">{showCoverageDetails ? 'Masquer' : 'Détails & Avis'}</span>
                {showCoverageDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>
            </button>

            {showCoverageDetails && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                {coverageNotice.disclaimer && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                        Avertissement officiel TITANIUM :
                      </span>
                      {coverageNotice.notice_version && (
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          v{coverageNotice.notice_version}
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                      {coverageNotice.disclaimer}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic bg-slate-100/70 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                  <strong className="not-italic font-semibold text-slate-700 dark:text-slate-300 mr-1">Rappel de portée :</strong>
                  Le statut <code className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">ACTIONABLE_PRODUCTION</code> atteste la maturité algorithmique du modèle statistique, mais ne constitue pas une autorisation de pari. La mention <code className="font-mono text-blue-700 dark:text-blue-400 font-medium">PRESUMED_AVAILABLE</code> indique une offre bookmaker courante présumée sans vérification de cote en temps réel.
                </p>

                {coverageSummary?.notesList?.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Notes de qualification par marché :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {coverageSummary.notesList.map(({ marketKey, note, opMeta, covMeta }) => (
                        <div
                          key={marketKey}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 capitalize">
                              {marketKey}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${opMeta.badgeClass}`}>
                                {opMeta.label}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${covMeta.badgeClass}`}>
                                {covMeta.label}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            {note}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 break-words">
                            ID: {opMeta.raw} • {covMeta.raw}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4 Cards Grid - Selectable & Interactive Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statisticalMarkets.map(({ key, label, refKey, refType, shortRefType, propKey, lambdaKey }) => {
            const refVal = anchors[refKey] !== undefined ? anchors[refKey] : diag[refKey];
            const prob = props[propKey] !== undefined ? props[propKey] : probs[propKey];
            const lambdaVal = props[lambdaKey] !== undefined ? props[lambdaKey] : probs[lambdaKey];
            const isSelected = selectedDiscipline === key;
            const mNotice = (() => {
              if (!coverageMarkets || typeof coverageMarkets !== 'object') return null;
              if (coverageMarkets[key] && typeof coverageMarkets[key] === 'object') return coverageMarkets[key];
              if (coverageMarkets[label] && typeof coverageMarkets[label] === 'object') return coverageMarkets[label];
              const lowerKey = key.toLowerCase();
              const foundKey = Object.keys(coverageMarkets).find(k => {
                const lk = k.toLowerCase();
                return lk === lowerKey || (lowerKey === 'sot' && (lk === 'shots_on_target' || lk === 'shots on target'));
              });
              return foundKey && typeof coverageMarkets[foundKey] === 'object' ? coverageMarkets[foundKey] : null;
            })();
            const isGenerated = Number.isFinite(lambdaVal);
            const isNoteExpanded = !!expandedCardNotes[key];

            return (
              <div
                key={key}
                className={`p-3 rounded-xl border flex flex-col justify-between shadow-xs min-w-0 gap-2.5 transition-all select-none ${
                  isSelected
                    ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500/70 ring-2 ring-blue-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectDiscipline(key)}
                  aria-pressed={isSelected}
                  className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg -m-1 p-1 transition-colors"
                >
                  {/* En-tête compact avec libellé de référence raccourci pour éviter toute troncature du titre */}
                  <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200 dark:border-slate-800/60">
                    <span className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {label}
                    </span>
                    <Badge
                      variant={isSelected ? 'info' : 'default'}
                      className="text-[9px] px-1.5 py-0.5 font-mono shrink-0"
                      title={refType}
                    >
                      {shortRefType}
                    </Badge>
                  </div>

                  {/* Bloc métrique dense 3 colonnes */}
                  {isGenerated ? (
                    <div className="mt-2 grid grid-cols-3 gap-1 py-1.5 px-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-center items-center">
                      <div className="flex flex-col items-center justify-center min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate w-full" title="Total Attendu (λ)">
                          λ Attendu
                        </span>
                        <span className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                          {Number.isFinite(lambdaVal) ? lambdaVal.toFixed(2) : '-'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0 border-x border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate w-full" title={`Référence : ${refType}`}>
                          Réf Ligue
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight">
                          {Number.isFinite(refVal) ? refVal.toFixed(2) : '-'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate w-full" title="Probabilité supérieure à la référence ou au seuil dérivé de ligue">
                          {key === 'throws' ? 'Prob > Seuil' : 'Prob > Réf'}
                        </span>
                        <span className={`font-mono text-xs sm:text-sm font-black leading-tight ${Number.isFinite(prob) ? getPropTextColor(prob) : 'text-slate-400'}`}>
                          {Number.isFinite(prob) ? `${(prob * 100).toFixed(1)}%` : '-'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="my-3 py-3 px-2 text-center bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      <p className="text-[10px] text-slate-400 italic">
                        Projection non générée dans cette session
                      </p>
                    </div>
                  )}
                </button>

                {/* Qualification secondaire repliée par défaut */}
                <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5" onClick={e => e.stopPropagation()}>
                  {mNotice && (() => {
                    const opMeta = getOperationalStatusMeta(mNotice.operational_status);
                    const covMeta = getBookmakerCoverageMeta(mNotice.bookmaker_coverage);

                    return (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => toggleCardNote(key)}
                          aria-expanded={isNoteExpanded}
                          className="w-full min-h-[32px] py-1 px-1 -mx-1 rounded-md flex items-center justify-between gap-1 text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-1 min-w-0 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded border font-medium text-[9px] tracking-tight ${opMeta.badgeClass}`}>
                              {opMeta.label}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded border font-medium text-[9px] tracking-tight ${covMeta.badgeClass}`}>
                              {covMeta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0 font-medium text-[10px]">
                            <span>{isNoteExpanded ? 'Masquer' : 'Détails'}</span>
                            {isNoteExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </div>
                        </button>

                        {/* Tiroir déplié : statut technique, couverture bookmaker et avertissements */}
                        {isNoteExpanded && (
                          <div className="p-2 rounded-lg bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[10px]">
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap justify-between items-baseline gap-1 font-mono text-[9px]">
                                <span className="text-slate-500 uppercase">Statut technique :</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 break-words">{opMeta.raw}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 leading-tight">{opMeta.description}</p>
                            </div>

                            <div className="pt-1 border-t border-slate-200/50 dark:border-slate-800/50 space-y-0.5">
                              <div className="flex flex-wrap justify-between items-baseline gap-1 font-mono text-[9px]">
                                <span className="text-slate-500 uppercase">Couverture bookmaker :</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 break-words">{covMeta.raw}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 leading-tight">{covMeta.description}</p>
                            </div>

                            {mNotice.notes && (
                              <div className="pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">
                                  Note de couverture :
                                </span>
                                <p className="text-slate-700 dark:text-slate-300 leading-tight">{mNotice.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="text-[9px] text-slate-400 dark:text-slate-500 italic text-right">
                    {key === 'throws' ? 'Moyenne arithmétique par équipe' : 'Médiane empirique ligue'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Second Card: Team Statistical Markets & Tripartite Poisson Models */}
      <div
        data-no-swipe="true"
        className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 relative"
      >
        {/* En-tête identifiable de la Carte 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Team Statistical Markets
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {match.Team_Stat_Markets?.Catalogue_Version
                    ? `v${match.Team_Stat_Markets.Catalogue_Version}`
                    : (match.Team_Stat_Markets?.Schema_Version
                        ? `v${match.Team_Stat_Markets.Schema_Version}`
                        : 'Legacy')}
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                Modélisations Poisson unilatérales par club (Domicile / Extérieur) et total de match.
              </p>
            </div>
          </div>

          {/* Badge de gouvernance scientifique INTERNAL_RESEARCH_ONLY */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              INTERNAL_RESEARCH_ONLY
            </span>
          </div>
        </div>

        {/* Sélecteur Pills Option A — Discipline Détaillée avec data-sub-swipe-ignore */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div
              ref={pillsContainerRef}
              data-sub-swipe-ignore="true"
              className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth max-w-full"
            >
              {statisticalMarkets.map(({ key, label, lambdaKey }) => {
                const isSelected = selectedDiscipline === key;
                const lambdaVal = props[lambdaKey];
                return (
                  <button
                    key={key}
                    ref={el => { pillRefs.current[key] = el; }}
                    data-discipline-key={key}
                    type="button"
                    onClick={() => handleSelectDiscipline(key)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <span>{label}</span>
                    {Number.isFinite(lambdaVal) && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        λ {lambdaVal.toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 italic shrink-0">
              Glissez horizontalement pour naviguer entre disciplines
            </span>
          </div>

          {/* Bandeau explicatif de recherche : masqué sur mobile (< 768px), affiché sur md+ */}
          <div className="hidden md:flex p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-[11px]">
              <strong className="text-slate-800 dark:text-slate-200 font-semibold mr-1">Discipline active : {currentMarketMeta.label}</strong>
              — Modélisations Poisson unilatérales par club ({
                match.Team_Stat_Markets?.Catalogue_Version
                  ? `Team_Stat_Markets v${match.Team_Stat_Markets.Catalogue_Version}`
                  : (match.Team_Stat_Markets?.Schema_Version
                      ? `Team_Stat_Markets v${match.Team_Stat_Markets.Schema_Version}`
                      : 'Prop_Bets (Session Legacy)')
              }).
            </p>
            <span className="text-[10px] text-slate-400 italic shrink-0">
              Modèle descriptif hors trading • Aucune cote bookmaker calculée
            </span>
          </div>

          {/* Conteneur de Sous-navigation Tactile (Sub-Swipe) pour le panneau tripartite */}
          <div
            ref={subSwipeContainerRef}
            onTouchStart={handleSubTouchStart}
            onTouchMove={handleSubTouchMove}
            onTouchEnd={handleSubTouchEnd}
            onTouchCancel={handleSubTouchCancel}
            className="relative overflow-hidden w-full select-none"
            style={{ touchAction: 'pan-y' }}
          >
            {/* Panneau voisin interactif (Mobile sub-swipe au doigt en temps réel) */}
            {subSwipeNeighbor && (
              <div
                ref={subNeighborPanelRef}
                aria-hidden="true"
                className="w-full absolute top-0 left-0 z-0 bg-white dark:bg-slate-900 will-change-transform"
                style={{
                  transform:
                    subSwipeNeighbor.direction === 'next'
                      ? 'translate3d(100%, 0, 0)'
                      : 'translate3d(-100%, 0, 0)',
                }}
              >
                {renderDisciplinePanel(subSwipeNeighbor.id)}
              </div>
            )}

            {/* Panneau actif courant */}
            <div
              ref={subCurrentPanelRef}
              key={`sub-current-${selectedDiscipline}`}
              className="w-full relative z-10 bg-white dark:bg-slate-900 will-change-transform"
              style={{ transform: 'translate3d(0px, 0, 0)' }}
            >
              {renderDisciplinePanel(selectedDiscipline)}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Proposition Bets & Core Market Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Proposition Market */}
        <div className="lg:col-span-1">
          <Card title="Proposition Market (Home > Away)" titleIcon={<Target size={16} />}>
            <div className="flex flex-col gap-3 mt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Probabilités estimées de domination volumétrique de l'équipe à domicile.
              </p>

              {propBetsKeys.length > 0 ? propBetsKeys.map(key => {
                const val = props[key];
                const label = key.replace('PROP_HOME_MORE_', '').replace(/_/g, ' ');
                const hasVal = Number.isFinite(val);

                return (
                  <div key={key} className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                        {label}
                      </span>
                      <span className={`font-mono text-sm font-bold ${hasVal ? getPropTextColor(val) : 'text-slate-400'}`}>
                        {hasVal ? `${(val * 100).toFixed(1)}%` : '-'}
                      </span>
                    </div>
                    {hasVal && (
                      <ProgressBar
                        value={val}
                        max={1}
                        colorClass={getPropColor(val)}
                        displayValue=" "
                      />
                    )}
                  </div>
                );
              }) : (
                <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  Projection non générée dans cette session
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Context Snapshot (Core Market) */}
        <div className="lg:col-span-1">
          <Card title="Core Market Snapshot" titleIcon={<BarChart3 size={16} />}>
            <div className="space-y-4 mt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Rappel synthétique du contexte classique 1X2 & Buts modélisé.
              </p>

              {/* 1X2 Mini Bar */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>1X2 Probabilités</span>
                  {isKillSwitchActive && <span className="text-rose-500 font-mono text-xs">KILL-SWITCH</span>}
                </div>
                {isKillSwitchActive ? (
                  <div className="p-2 text-center text-rose-500 text-xs font-mono bg-rose-500/5 rounded border border-rose-500/20">
                    Probabilités neutralisées par le Kill-Switch
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Home</div>
                      <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{((probs.PROB_1 || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-slate-500 font-bold uppercase">Draw</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{((probs.PROB_X || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase">Away</div>
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-300">{((probs.PROB_2 || 0) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Goals Snapshot */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Buts & Intensité Modélisée
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500">Over 2.5:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{((probs.PROB_O25 || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500">BTTS:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{((probs.PROB_BTTS || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500">λ Home:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{diag.lambda_home?.toFixed(2) || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500">λ Away:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{diag.lambda_away?.toFixed(2) || '-'}</span>
                  </div>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('core')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <span>Explorer le Core Market complet</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Tactical Context & Signals */}
        <div className="lg:col-span-1">
          <Card title="Tactical Context & Signals" titleIcon={<Activity size={16} />}>
            <div className="space-y-3 mt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Indicateurs descriptifs contextuels et signaux tactiques modélisés.
              </p>

              {/* Match Openness Index & League Reference */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold truncate">
                    Match Openness Index
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Degré d'ouverture offensive du match
                  </span>
                  {Number.isFinite(killSwitchDiag.median_openness) && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      Réf Ligue (médiane) : {killSwitchDiag.median_openness.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                    {Number.isFinite(tactical.match_openness_index)
                      ? tactical.match_openness_index.toFixed(2)
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Wastefulness Scores (Home vs Away side-by-side) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Wastefulness Scores</span>
                  <span className="text-[10px] font-normal normal-case italic text-slate-400">Inefficacité relative</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold block mb-1">
                      Home
                    </span>
                    <span className="font-mono text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 block">
                      {Number.isFinite(tactical.home_wastefulness_score)
                        ? tactical.home_wastefulness_score.toFixed(3)
                        : '-'}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-wider font-bold block mb-1">
                      Away
                    </span>
                    <span className="font-mono text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 block">
                      {Number.isFinite(tactical.away_wastefulness_score)
                        ? tactical.away_wastefulness_score.toFixed(3)
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* False Favorite Alert */}
              {tactical.IS_FALSE_FAVORITE === true && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <ShieldAlert className="text-rose-600 dark:text-rose-400 shrink-0" size={16} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider leading-none truncate">
                        FALSE FAVORITE ALERT
                      </span>
                      <span className="text-[11px] text-rose-500/80 mt-0.5">
                        Favori algorithmique vulnérable
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                    {Number.isFinite(tactical.false_favorite_score)
                      ? tactical.false_favorite_score.toFixed(3)
                      : '-'}
                  </span>
                </div>
              )}

              {/* Contextual notice */}
              <p className="text-[9px] text-slate-400 dark:text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800/80">
                * Indicateurs descriptifs de dynamique de jeu. Ne constituent pas des règles de décision ou des validations d’engagement.
              </p>
            </div>
          </Card>
        </div>

      </div>

      {/* Bottom Section: League Anchors Reference Table */}
      <Card title="League Statistical Reference Anchors" titleIcon={<Layers size={16} />}>
        <div className="space-y-3 mt-1">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Métrique</th>
                  <th className="py-2 px-3">Nature du repère</th>
                  <th className="py-2 px-3 text-right">Valeur Ligue</th>
                  <th className="py-2 px-3 text-right">Lambda Match</th>
                  <th className="py-2 px-3 text-right">Prob &gt; Réf Ligue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {statisticalMarkets.map(({ key, label, refKey, refType, propKey, lambdaKey }) => {
                  const refVal = anchors[refKey] !== undefined ? anchors[refKey] : diag[refKey];
                  const prob = props[propKey] !== undefined ? props[propKey] : probs[propKey];
                  const lambdaVal = props[lambdaKey] !== undefined ? props[lambdaKey] : probs[lambdaKey];
                  const isGen = Number.isFinite(lambdaVal);

                  return (
                    <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">
                        {label}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 text-xs">
                        {refType}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {Number.isFinite(refVal) ? refVal.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {isGen ? lambdaVal.toFixed(2) : <span className="text-slate-400 italic text-xs">Non générée</span>}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${Number.isFinite(prob) ? getPropTextColor(prob) : 'text-slate-400'}`}>
                        {Number.isFinite(prob) ? `${(prob * 100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800">
            * Indicateurs statistiques de référence algorithmique (moyennes et médianes de ligue). Pour les Touches, la référence de ligue (mean_throws) correspond à une moyenne par équipe, tandis que la probabilité supérieure au repère évalue le volume global du match face au seuil dérivé de ligue.
          </p>
        </div>
      </Card>

    </div>
  );
}
