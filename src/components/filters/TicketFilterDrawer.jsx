import React from 'react';
import {
  X,
  Check,
  RotateCcw,
  Layers,
  Globe,
  Calendar,
  Clock,
  Percent,
  Sliders,
  Zap,
  Flame,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  LEAGUE_GROUPS,
  PRODUCT_FAMILIES,
  TIME_SLOTS,
  SUB_TIME_SLOTS,
  hasActiveLegCriteria,
  formatDateDisplay,
  computeTicketWhatIfCounts,
  computePickWhatIfCounts,
  pickPassesFilters,
  ticketPassesFilters,
  transitionSelectLeagueGroup,
  transitionSetSelectedLeagues,
  sanitizeLegFilters,
  getScopeTypeLabel,
  MARKET_SUBDISCIPLINES,
  GEOGRAPHIC_LEAGUE_HIERARCHY
} from '../../utils/ticketFilters.js';
import { LeagueTreeSelector } from './LeagueTreeSelector.jsx';

export function TicketFilterDrawer({
  isOpen,
  onClose,
  tab = 'strategies', // 'strategies' | 'picks'
  tickets = [],
  picks = [],
  ticketFilters,
  setTicketFilters,
  picksFilters,
  setPicksFilters,
  onResetTicketFilters,
  onResetPicksFilters,
  totalTicketsCount = 0,
  filteredTicketsCount = 0,
  totalPicksCount = 0,
  filteredPicksCount = 0,
  availableLeagues = [],
  availableMarketFamilies = [],
  availablePicksProfiles = [],
  availablePicksTypes = [],
  availableDates = [],
  isTicketLive,
  nowMs = Date.now()
}) {
  const isTickets = tab === 'strategies';
  const [showAdvancedOptions, setShowAdvancedOptions] = React.useState(false);

  // Table de correspondance biunivoque entre libellés de familles brutes et identifiants canoniques
  const RAW_TO_FAMILY_ID = React.useMemo(() => ({
    'Prop Totaux': 'PROP_TOTAUX',
    'Prop H2H': 'PROP_H2H',
    'Classique Buts': 'CLASSIQUE_BUTS',
    'Team Goals': 'TEAM_GOALS',
    'Classique 1X2': 'CLASSIQUE_1X2',
    'Contrarien': 'CONTRARIEN'
  }), []);

  // Découverte dynamique de tous les scope_type réellement présents dans les tickets de la session
  const availableScopeTypes = React.useMemo(() => {
    const set = new Set();
    (tickets || []).forEach(t => {
      if (t.scope_type) set.add(t.scope_type);
    });
    const preferredOrder = ['FULL_POOL', 'LEAGUE_SCOPED', 'COMPOUND_SCOPE', 'TIME_WINDOW', 'MARKET_SCOPED'];
    const ordered = preferredOrder.filter(st => set.has(st));
    set.forEach(st => {
      if (!ordered.includes(st)) ordered.push(st);
    });
    return ordered;
  }, [tickets]);

  // Découverte dynamique des sous-marchés réellement présents dans les tickets, groupés par famille parente
  const availableSubMarketsByFamily = React.useMemo(() => {
    const map = {};
    (tickets || []).forEach(t => {
      (t.legs || []).forEach(l => {
        const fam = l.family_name || l.Type;
        if (!fam) return;
        if (!map[fam]) map[fam] = new Set();

        const marche = String(l.Marche || '').toUpperCase();
        if (fam === 'Prop Totaux' || fam === 'PROP_BET' || fam === 'PROP_TOTAUX') {
          if (marche.includes('CORNER')) map[fam].add('CORNERS_TOTALS');
          if (marche.includes('SHOT')) map[fam].add('SHOTS_TOTALS');
          if (marche.includes('SOT')) map[fam].add('SOT_TOTALS');
          if (marche.includes('THROW') || marche.includes('TOUCHE')) map[fam].add('THROWS_TOTALS');
        } else if (fam === 'Prop H2H' || fam === 'H2H_PROP' || fam === 'PROP_H2H') {
          if (marche.includes('CORNER')) map[fam].add('CORNERS_H2H');
          if (marche.includes('SOT')) map[fam].add('SOT_H2H');
          if (marche.includes('SHOT')) map[fam].add('SHOTS_H2H');
          if (marche.includes('THROW') || marche.includes('TOUCHE')) map[fam].add('THROWS_H2H');
        } else if (fam === 'Classique Buts' || fam === 'CLASSIQUE_BUTS') {
          if (marche.includes('BTTS') || marche.includes('BOTH TEAMS')) map[fam].add('BTTS');
          if (marche.includes('OVER 1.5')) map[fam].add('OVER_15_GOALS');
          if (marche.includes('OVER 2.5')) map[fam].add('OVER_25_GOALS');
          if (marche.includes('UNDER 2.5')) map[fam].add('UNDER_25_GOALS');
          if (marche.includes('UNDER 3.5')) map[fam].add('UNDER_35_GOALS');
        } else if (fam === 'Team Goals' || fam === 'TEAM_GOALS') {
          if (marche.includes('OVER 0.5')) map[fam].add('OVER_05_TEAM');
          if (marche.includes('OVER 1.5')) map[fam].add('OVER_15_TEAM');
        } else if (fam === 'Classique 1X2' || fam === 'CLASSIQUE_1X2') {
          if (marche.includes('(1)') || marche.includes('HOME')) map[fam].add('HOME_1');
          if (marche.includes('(2)') || marche.includes('AWAY')) map[fam].add('AWAY_2');
        } else if (fam === 'Contrarien' || fam === 'CONTRARIEN') {
          map[fam].add('REBOND_JUSTICE');
        }
      });
    });

    const result = {};
    for (const [f, subSet] of Object.entries(map)) {
      result[f] = Array.from(subSet);
    }
    return result;
  }, [tickets]);

  // Liste plate de tous les sous-marchés disponibles
  const allAvailableSubMarketIds = React.useMemo(() => {
    const set = new Set();
    Object.values(availableSubMarketsByFamily).forEach(list => {
      list.forEach(id => set.add(id));
    });
    return Array.from(set);
  }, [availableSubMarketsByFamily]);

  const handleToggleMarketFamily = (family) => {
    setTicketFilters(prev => {
      const current = prev.selectedMarketFamilies || [];
      const exists = current.includes(family);
      const nextFamilies = exists ? current.filter(f => f !== family) : [...current, family];

      // Nettoyage explicite des sous-marchés devenus incompatibles
      const activeFamilyIds = new Set(nextFamilies.map(f => RAW_TO_FAMILY_ID[f] || f));
      const nextSubMarkets = (prev.selectedSubMarkets || []).filter(subId => {
        const meta = MARKET_SUBDISCIPLINES[subId];
        return meta && activeFamilyIds.has(meta.familyId);
      });

      return sanitizeLegFilters({
        ...prev,
        selectedMarketFamilies: nextFamilies,
        selectedSubMarkets: nextSubMarkets
      });
    });
  };

  const handleToggleSubMarket = (subMarketId) => {
    setTicketFilters(prev => {
      const current = prev.selectedSubMarkets || [];
      const exists = current.includes(subMarketId);
      const nextSubMarkets = exists
        ? current.filter(s => s !== subMarketId)
        : [...current, subMarketId];
      return sanitizeLegFilters({
        ...prev,
        selectedSubMarkets: nextSubMarkets
      });
    });
  };

  const handleClearSubMarkets = () => {
    setTicketFilters(prev => sanitizeLegFilters({
      ...prev,
      selectedSubMarkets: []
    }));
  };

  // Détermination des tickets candidats en respectant le filtre LIVE estimé si actif
  const candidateTickets = React.useMemo(() => {
    if (!ticketFilters?.liveEstimatedOnly || typeof isTicketLive !== 'function') return tickets;
    return tickets.filter(t => isTicketLive(t, nowMs));
  }, [tickets, ticketFilters?.liveEstimatedOnly, isTicketLive, nowMs]);

  // Calcul des compteurs prospectifs (Toggle What-If) pour les tickets assemblés
  const ticketWhatIfCounts = React.useMemo(() => {
    if (!isTickets) return {};
    return {
      structure: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'structure', ['ALL', 'SINGLES', 'COMBOS']),
      productCode: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'productCode', PRODUCT_FAMILIES.map(f => f.code)),
      leagueGroup: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'leagueGroup', ['ALL', ...Object.keys(LEAGUE_GROUPS)]),
      selectedLeagues: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'selectedLeagues', availableLeagues),
      selectedMarketFamilies: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'selectedMarketFamilies', availableMarketFamilies),
      selectedSubMarkets: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'selectedSubMarkets', allAvailableSubMarketIds),
      selectedDate: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'selectedDate', ['ALL', ...availableDates]),
      timeSlot: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'timeSlot', ['ALL', ...Object.keys(SUB_TIME_SLOTS), ...Object.keys(TIME_SLOTS)]),
      minProbThreshold: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'minProbThreshold', [0, 0.70, 0.75, 0.80, 0.85]),
      scopeType: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'scopeType', ['ALL', ...availableScopeTypes]),
      legMatchMode: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'legMatchMode', [
        'ANY', 'AT_LEAST_2', 'AT_LEAST_3', 'CUSTOM', 'ALL'
      ])
    };
  }, [isTickets, candidateTickets, ticketFilters, availableLeagues, availableMarketFamilies, allAvailableSubMarketIds, availableDates, availableScopeTypes]);

  // Compteurs pays pour tickets assemblés
  const ticketCountryWhatIfCounts = React.useMemo(() => {
    if (!isTickets) return {};
    const counts = {};
    for (const region of Object.values(GEOGRAPHIC_LEAGUE_HIERARCHY)) {
      for (const [code, country] of Object.entries(region.countries)) {
        const cLeagues = country.leagues || [];
        const allSelected = cLeagues.length > 0 && cLeagues.every(l => (ticketFilters.selectedLeagues || []).includes(l));
        let testLeagues;
        if (allSelected) {
          testLeagues = (ticketFilters.selectedLeagues || []).filter(l => !cLeagues.includes(l));
        } else {
          testLeagues = Array.from(new Set([...(ticketFilters.selectedLeagues || []), ...cLeagues]));
        }
        const testFilters = {
          ...ticketFilters,
          selectedLeagues: testLeagues,
          leagueGroup: testLeagues.length > 0 ? 'ALL' : ticketFilters.leagueGroup
        };
        counts[code] = candidateTickets.filter(t => ticketPassesFilters(t, testFilters)).length;
      }
    }
    return counts;
  }, [isTickets, candidateTickets, ticketFilters]);

  // Compteurs prospectifs pour les Choix Finaux
  const picksWhatIfCounts = React.useMemo(() => {
    if (isTickets) return {};
    const effectivePicksFilters = { ...picksFilters, currentNowMs: nowMs };
    return {
      tier: computePickWhatIfCounts(picks, effectivePicksFilters, 'tier', ['ALL', '1', '2', '3', '4']),
      leagueGroup: computePickWhatIfCounts(picks, effectivePicksFilters, 'leagueGroup', ['ALL', ...Object.keys(LEAGUE_GROUPS)]),
      selectedLeagues: computePickWhatIfCounts(picks, effectivePicksFilters, 'selectedLeagues', availableLeagues),
      selectedType: computePickWhatIfCounts(picks, effectivePicksFilters, 'selectedType', ['ALL', ...availablePicksTypes]),
      selectedProfile: computePickWhatIfCounts(picks, effectivePicksFilters, 'selectedProfile', ['ALL', ...availablePicksProfiles]),
      selectedDate: computePickWhatIfCounts(picks, effectivePicksFilters, 'selectedDate', ['ALL', ...availableDates]),
      timeSlot: computePickWhatIfCounts(picks, effectivePicksFilters, 'timeSlot', ['ALL', ...Object.keys(SUB_TIME_SLOTS), ...Object.keys(TIME_SLOTS)]),
      alphaOnly: picks.filter(p => pickPassesFilters(p, { ...effectivePicksFilters, alphaOnly: !picksFilters.alphaOnly })).length,
      superSignalOnly: picks.filter(p => pickPassesFilters(p, { ...effectivePicksFilters, superSignalOnly: !picksFilters.superSignalOnly })).length,
      liveOnly: picks.filter(p => pickPassesFilters(p, { ...effectivePicksFilters, liveOnly: !picksFilters.liveOnly })).length,
      liveEstimatedOnly: picks.filter(p => pickPassesFilters(p, { ...effectivePicksFilters, liveEstimatedOnly: !picksFilters.liveEstimatedOnly })).length,
      streakStatus: picks.filter(p => pickPassesFilters(p, {
        ...effectivePicksFilters,
        streakStatus: picksFilters.streakStatus === 'STREAK_CONFIRMED' ? 'ALL' : 'STREAK_CONFIRMED'
      })).length
    };
  }, [isTickets, picks, picksFilters, availableLeagues, availablePicksTypes, availablePicksProfiles, availableDates, nowMs]);

  // Compteurs pays pour Choix Finaux
  const picksCountryWhatIfCounts = React.useMemo(() => {
    if (isTickets) return {};
    const counts = {};
    for (const region of Object.values(GEOGRAPHIC_LEAGUE_HIERARCHY)) {
      for (const [code, country] of Object.entries(region.countries)) {
        const cLeagues = country.leagues || [];
        const allSelected = cLeagues.length > 0 && cLeagues.every(l => (picksFilters.selectedLeagues || []).includes(l));
        let testLeagues;
        if (allSelected) {
          testLeagues = (picksFilters.selectedLeagues || []).filter(l => !cLeagues.includes(l));
        } else {
          testLeagues = Array.from(new Set([...(picksFilters.selectedLeagues || []), ...cLeagues]));
        }
        const testFilters = {
          ...picksFilters,
          selectedLeagues: testLeagues,
          leagueGroup: testLeagues.length > 0 ? 'ALL' : picksFilters.leagueGroup
        };
        counts[code] = picks.filter(p => pickPassesFilters(p, testFilters)).length;
      }
    }
    return counts;
  }, [isTickets, picks, picksFilters]);

  // Tiers disponibles
  const availableTiers = React.useMemo(() => {
    const tiers = new Set();
    picks.forEach(p => {
      if (p.Tier !== undefined && p.Tier !== null) tiers.add(p.Tier);
    });
    return Array.from(tiers).sort((a, b) => a - b);
  }, [picks]);

  // Détection si des options avancées sont actives
  const hasActiveAdvancedOptions = React.useMemo(() => {
    if (!isTickets || !ticketFilters) return false;
    const hasProb = Boolean(ticketFilters.minProbThreshold && ticketFilters.minProbThreshold > 0);
    const hasProduct = Boolean(ticketFilters.productCode && ticketFilters.productCode !== 'ALL');
    const hasLegMode = Boolean(hasActiveLegCriteria(ticketFilters) && ticketFilters.legMatchMode && ticketFilters.legMatchMode !== 'ANY');
    return hasProb || hasProduct || hasLegMode;
  }, [isTickets, ticketFilters]);

  // Si le tiroir est fermé, on ne rend rien dans le DOM, mais tous les Hooks ont été exécutés inconditionnellement
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">

        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-emerald-500" />
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
              {isTickets ? 'Filtres Tickets Assemblés' : 'Filtres Choix Finaux'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Criteria Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 custom-scrollbar text-xs">
          {isTickets ? (
            /* =========================================================================
             * SECTION TICKETS ASSEMBLÉS (Réorganisée selon l'ordre canonique UX)
             * ========================================================================= */
            <>
              {/* Ligne compacte : Structure du Ticket (Tous / Singles / Combinés) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Layers size={12} className="text-emerald-500" /> Structure
                  </span>
                  {ticketFilters.structure !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, structure: 'ALL' }))}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Tous
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                  {[
                    { id: 'ALL', label: 'Tous', count: ticketWhatIfCounts?.structure?.['ALL'] ?? totalTicketsCount },
                    { id: 'SINGLES', label: 'Singles', count: ticketWhatIfCounts?.structure?.['SINGLES'] ?? 0 },
                    { id: 'COMBOS', label: 'Combinés', count: ticketWhatIfCounts?.structure?.['COMBOS'] ?? 0 }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTicketFilters(prev => ({
                        ...prev,
                        structure: opt.id,
                        productCode: opt.id === 'ALL' || opt.id === 'SINGLES' ? 'ALL' : prev.productCode
                      }))}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 min-h-[36px] ${
                        ticketFilters.structure === opt.id && (opt.id !== 'COMBOS' || ticketFilters.productCode === 'ALL')
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-mono opacity-80">({opt.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Date du match et créneaux horaires */}
              <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                {/* Date du match */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar size={13} className="text-sky-500" /> Date du Match
                    </label>
                    {ticketFilters.selectedDate !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setTicketFilters(prev => ({ ...prev, selectedDate: 'ALL' }))}
                        className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Toutes les dates
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, selectedDate: 'ALL' }))}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 min-h-[34px] ${
                        ticketFilters.selectedDate === 'ALL'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span>Toutes</span>
                      <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.selectedDate?.['ALL'] ?? totalTicketsCount})</span>
                    </button>
                    {availableDates.map(dateStr => (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setTicketFilters(prev => ({ ...prev, selectedDate: dateStr }))}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 min-h-[34px] ${
                          ticketFilters.selectedDate === dateStr
                            ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <span>{formatDateDisplay(dateStr)}</span>
                        <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.selectedDate?.[dateStr] ?? 0})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Créneaux horaires */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-500" /> Créneaux Horaires
                    </label>
                    {ticketFilters.timeSlot && ticketFilters.timeSlot !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setTicketFilters(prev => ({ ...prev, timeSlot: 'ALL' }))}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Tous les créneaux
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, timeSlot: 'ALL' }))}
                      className={`py-1.5 px-2 rounded-lg text-center text-xs font-semibold border transition-all flex flex-col items-center justify-center min-h-[38px] ${
                        (ticketFilters.timeSlot || 'ALL') === 'ALL'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>Tous</span>
                      <span className="text-[9px] font-mono opacity-80">({ticketWhatIfCounts?.timeSlot?.['ALL'] ?? candidateTickets.length})</span>
                    </button>
                    {Object.values(SUB_TIME_SLOTS).map(slot => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setTicketFilters(prev => ({ ...prev, timeSlot: prev.timeSlot === slot.id ? 'ALL' : slot.id }))}
                        title={`${slot.label} (${slot.period || slot.hoursRange}) : ${slot.description}`}
                        className={`py-1.5 px-1.5 rounded-lg text-center text-xs font-semibold border transition-all flex flex-col items-center justify-center min-h-[38px] ${
                          ticketFilters.timeSlot === slot.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate max-w-full text-[10px] leading-tight">{slot.label}</span>
                        <span className="text-[9px] font-mono opacity-80">({ticketWhatIfCounts?.timeSlot?.[slot.id] ?? 0})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Groupe de Ligues */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Globe size={13} className="text-purple-500" /> Groupe de Ligues
                  </label>
                  {ticketFilters.leagueGroup !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => transitionSelectLeagueGroup(prev, 'ALL'))}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Tous les groupes
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => transitionSelectLeagueGroup(prev, 'ALL'))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between min-h-[36px] ${
                      ticketFilters.leagueGroup === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>Tous les groupes</span>
                    <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.leagueGroup?.['ALL'] ?? totalTicketsCount})</span>
                  </button>
                  {Object.values(LEAGUE_GROUPS).map(grp => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setTicketFilters(prev => transitionSelectLeagueGroup(prev, grp.id))}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1 truncate min-h-[36px] ${
                        ticketFilters.leagueGroup === grp.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                      title={grp.description}
                    >
                      <span className="truncate">{grp.label}</span>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.leagueGroup?.[grp.id] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Famille de marché et sous-marchés */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sliders size={13} className="text-blue-500" /> Marchés & Disciplines
                    </label>
                    {ticketFilters.selectedMarketFamilies?.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {ticketFilters.selectedMarketFamilies.length} active{ticketFilters.selectedMarketFamilies.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {ticketFilters.selectedMarketFamilies?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => sanitizeLegFilters({ ...prev, selectedMarketFamilies: [], selectedSubMarkets: [] }))}
                      className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      Effacer marchés
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {availableMarketFamilies.map(fam => {
                    const isSelected = ticketFilters.selectedMarketFamilies?.includes(fam);
                    const count = ticketWhatIfCounts?.selectedMarketFamilies?.[fam] ?? 0;
                    return (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => handleToggleMarketFamily(fam)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 min-h-[34px] ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        title={isSelected ? `Famille active. Résultat après retrait : ${count}` : `Famille inactive. Résultat après sélection : ${count}`}
                      >
                        <span>{fam}</span>
                        <span className="text-[10px] font-mono opacity-80">
                          {isSelected ? `retrait → ${count}` : `(${count})`}
                        </span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>

                {/* Sous-marchés contextuels (dépliés pour les familles sélectionnées) */}
                {ticketFilters.selectedMarketFamilies?.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Sous-marchés précis
                        </span>
                        {ticketFilters.selectedSubMarkets?.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] font-bold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                            {ticketFilters.selectedSubMarkets.length}×
                          </span>
                        )}
                      </div>
                      {ticketFilters.selectedSubMarkets?.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSubMarkets}
                          className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw size={10} />
                          <span>Effacer</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {ticketFilters.selectedMarketFamilies.map(fam => {
                        const subIds = availableSubMarketsByFamily[fam] || [];
                        if (subIds.length === 0) return null;

                        return (
                          <div key={fam} className="space-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              • {fam} :
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {subIds.map(subId => {
                                const meta = MARKET_SUBDISCIPLINES[subId] || { label: subId };
                                const isSelected = (ticketFilters.selectedSubMarkets || []).includes(subId);
                                const count = ticketWhatIfCounts?.selectedSubMarkets?.[subId] ?? 0;
                                return (
                                  <button
                                    key={subId}
                                    type="button"
                                    onClick={() => handleToggleSubMarket(subId)}
                                    className={`px-2 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1 min-h-[30px] ${
                                      isSelected
                                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs font-bold'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                    title={isSelected ? `Sous-marché actif. Retrait : ${count}` : `Sous-marché inactif. Sélection : ${count}`}
                                  >
                                    <span>{meta.label}</span>
                                    <span className="text-[9px] font-mono opacity-80">
                                      {isSelected ? `retrait → ${count}` : `(${count})`}
                                    </span>
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Périmètre d'assemblage (scope_type) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-500" /> Périmètre d&apos;assemblage
                  </label>
                  {ticketFilters.scopeType !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, scopeType: 'ALL' }))}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Tous les périmètres
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, scopeType: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1 min-h-[36px] ${
                      ticketFilters.scopeType === 'ALL'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                    title="Tous les périmètres d'assemblage"
                  >
                    <span className="truncate">Tous les périmètres</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.scopeType?.['ALL'] ?? totalTicketsCount})</span>
                  </button>
                  {availableScopeTypes.map(st => {
                    const isSelected = ticketFilters.scopeType === st;
                    const count = ticketWhatIfCounts?.scopeType?.[st] ?? 0;
                    const label = getScopeTypeLabel(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTicketFilters(prev => ({ ...prev, scopeType: st }))}
                        className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1 min-h-[36px] ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                        title={`Valeur canonique : ${st}`}
                      >
                        <span className="truncate">{label}</span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Sélection géographique des ligues */}
              <LeagueTreeSelector
                selectedLeagues={ticketFilters.selectedLeagues || []}
                onSetSelectedLeagues={(nextLeagues) => {
                  setTicketFilters(prev => transitionSetSelectedLeagues(prev, nextLeagues));
                }}
                availableLeagues={availableLeagues}
                leagueWhatIfCounts={ticketWhatIfCounts?.selectedLeagues || {}}
                countryWhatIfCounts={ticketCountryWhatIfCounts}
                isTickets={true}
              />

              {/* 6. Options avancées (Section repliable compacte) */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(prev => !prev)}
                  className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors text-left min-h-[44px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={14} className="text-amber-500 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                      Options avancées
                    </span>
                    {hasActiveAdvancedOptions && (
                      <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        Actives
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                    <span className="text-[10px] font-mono">
                      {showAdvancedOptions ? 'Replier' : 'Déplier'}
                    </span>
                    {showAdvancedOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>

                {showAdvancedOptions && (
                  <div className="p-3.5 pt-1 space-y-4 border-t border-slate-200/60 dark:border-slate-800/60">
                    {/* A. Correspondance des jambes */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Correspondance des jambes
                        </span>
                        {!hasActiveLegCriteria(ticketFilters) && (
                          <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                            Neutralisé
                          </span>
                        )}
                      </div>

                      {!hasActiveLegCriteria(ticketFilters) ? (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle size={13} className="shrink-0 text-amber-500" />
                            <span>Contrôle neutralisé</span>
                          </div>
                          <p className="leading-snug text-slate-600 dark:text-slate-400">
                            Aucun critère relatif aux jambes n&apos;est actif (ligue, marché, date ou créneau). Dès qu&apos;un critère sera activé, le mode standard « Au moins 1 » s&apos;appliquera.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {[
                            { id: 'ANY', label: 'Au moins 1' },
                            { id: 'AT_LEAST_2', label: 'Au moins 2' },
                            { id: 'AT_LEAST_3', label: 'Au moins 3' },
                            { id: 'CUSTOM', label: 'Au moins N' },
                            { id: 'ALL', label: 'Toutes les jambes (ALL)', colSpan: 'sm:col-span-2' }
                          ].map(mode => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setTicketFilters(prev => ({
                                ...prev,
                                legMatchMode: mode.id,
                                minLegsMatching: mode.id === 'CUSTOM' ? (prev.minLegsMatching || 2) : prev.minLegsMatching
                              }))}
                              className={`py-1.5 px-2 rounded-lg font-bold text-xs border transition-all text-left flex items-center justify-between min-h-[34px] ${mode.colSpan || ''} ${
                                ticketFilters.legMatchMode === mode.id
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="truncate">{mode.label}</span>
                              <span className="text-[10px] font-mono opacity-80 shrink-0">
                                ({ticketWhatIfCounts?.legMatchMode?.[mode.id] ?? 0})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {hasActiveLegCriteria(ticketFilters) && ticketFilters.legMatchMode === 'CUSTOM' && (
                        <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Seuil minimum de jambes N :
                            </span>
                            <span className="text-sm font-mono font-black text-sky-600 dark:text-sky-400">
                              ≥ {ticketFilters.minLegsMatching || 1}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="12"
                            step="1"
                            value={ticketFilters.minLegsMatching || 1}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1));
                              setTicketFilters(prev => ({ ...prev, minLegsMatching: val }));
                            }}
                            className="w-full accent-sky-600 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* B. Seuil de probabilité minimale */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Percent size={13} className="text-emerald-500" /> Prob. Min. d&apos;une jambe
                        </label>
                        {ticketFilters.minProbThreshold > 0 && (
                          <button
                            type="button"
                            onClick={() => setTicketFilters(prev => ({ ...prev, minProbThreshold: 0 }))}
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            Tous
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { val: 0, label: 'Tous' },
                          { val: 0.70, label: '≥ 70%' },
                          { val: 0.75, label: '≥ 75%' },
                          { val: 0.80, label: '≥ 80%' },
                          { val: 0.85, label: '≥ 85%' }
                        ].map(lvl => (
                          <button
                            key={lvl.val}
                            type="button"
                            onClick={() => setTicketFilters(prev => ({ ...prev, minProbThreshold: lvl.val }))}
                            className={`py-1.5 px-1 rounded-lg text-center text-xs font-bold border transition-all flex flex-col items-center justify-center min-h-[36px] ${
                              ticketFilters.minProbThreshold === lvl.val
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>{lvl.label}</span>
                            <span className="text-[9px] font-mono opacity-80">({ticketWhatIfCounts?.minProbThreshold?.[lvl.val] ?? 0})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* C. Familles de combinés */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-sky-500" /> Familles de Combinés
                        </span>
                        {ticketFilters.productCode !== 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setTicketFilters(prev => ({ ...prev, productCode: 'ALL' }))}
                            className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                          >
                            Toutes
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {PRODUCT_FAMILIES.map(fam => {
                          const isSelected = ticketFilters.productCode === fam.code;
                          const count = ticketWhatIfCounts?.productCode?.[fam.code] ?? 0;
                          return (
                            <button
                              key={fam.code}
                              type="button"
                              onClick={() => setTicketFilters(prev => ({
                                ...prev,
                                productCode: prev.productCode === fam.code ? 'ALL' : fam.code,
                                structure: prev.structure === 'SINGLES' ? 'ALL' : prev.structure
                              }))}
                              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-between gap-1 text-left min-h-[34px] ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-bold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <span className="truncate">{fam.label}</span>
                              <span className="text-[10px] font-mono opacity-80 shrink-0">({count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* =========================================================================
             * SECTION CHOIX FINAUX (CHOIX_FINAUX)
             * ========================================================================= */
            <>
              {/* 1. Date du match et créneaux horaires */}
              <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                {/* Date du match */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar size={13} className="text-sky-500" /> Date du Match
                    </label>
                    {picksFilters.selectedDate !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setPicksFilters(prev => ({ ...prev, selectedDate: 'ALL' }))}
                        className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Toutes les dates
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, selectedDate: 'ALL' }))}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 min-h-[34px] ${
                        picksFilters.selectedDate === 'ALL'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span>Toutes</span>
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedDate?.ALL ?? totalPicksCount})</span>
                    </button>
                    {availableDates.map(dateStr => (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setPicksFilters(prev => ({ ...prev, selectedDate: dateStr }))}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 min-h-[34px] ${
                          picksFilters.selectedDate === dateStr
                            ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <span>{formatDateDisplay(dateStr)}</span>
                        <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedDate?.[dateStr] ?? 0})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Créneaux horaires */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-500" /> Créneaux Horaires
                    </label>
                    {picksFilters.timeSlot && picksFilters.timeSlot !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setPicksFilters(prev => ({ ...prev, timeSlot: 'ALL' }))}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Tous les créneaux
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, timeSlot: 'ALL' }))}
                      className={`py-1.5 px-2 rounded-lg text-center text-xs font-semibold border transition-all flex flex-col items-center justify-center min-h-[38px] ${
                        (picksFilters.timeSlot || 'ALL') === 'ALL'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>Tous</span>
                      <span className="text-[9px] font-mono opacity-80">({picksWhatIfCounts?.timeSlot?.['ALL'] ?? totalPicksCount})</span>
                    </button>
                    {Object.values(SUB_TIME_SLOTS).map(slot => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setPicksFilters(prev => ({ ...prev, timeSlot: prev.timeSlot === slot.id ? 'ALL' : slot.id }))}
                        title={`${slot.label} (${slot.period || slot.hoursRange}) : ${slot.description}`}
                        className={`py-1.5 px-1.5 rounded-lg text-center text-xs font-semibold border transition-all flex flex-col items-center justify-center min-h-[38px] ${
                          picksFilters.timeSlot === slot.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate max-w-full text-[10px] leading-tight">{slot.label}</span>
                        <span className="text-[9px] font-mono opacity-80">({picksWhatIfCounts?.timeSlot?.[slot.id] ?? 0})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Groupe de Ligues */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Globe size={13} className="text-purple-500" /> Groupe de Ligues
                  </label>
                  {picksFilters.leagueGroup !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setPicksFilters(prev => transitionSelectLeagueGroup(prev, 'ALL'))}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Tous les groupes
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => transitionSelectLeagueGroup(prev, 'ALL'))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between min-h-[36px] ${
                      picksFilters.leagueGroup === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>Tous les groupes</span>
                    <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.leagueGroup?.['ALL'] ?? totalPicksCount})</span>
                  </button>
                  {Object.values(LEAGUE_GROUPS).map(grp => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setPicksFilters(prev => transitionSelectLeagueGroup(prev, grp.id))}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1 truncate min-h-[36px] ${
                        picksFilters.leagueGroup === grp.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                      title={grp.description}
                    >
                      <span className="truncate">{grp.label}</span>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">({picksWhatIfCounts?.leagueGroup?.[grp.id] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Sélection géographique des ligues */}
              <LeagueTreeSelector
                selectedLeagues={picksFilters.selectedLeagues || []}
                onSetSelectedLeagues={(nextLeagues) => {
                  setPicksFilters(prev => transitionSetSelectedLeagues(prev, nextLeagues));
                }}
                availableLeagues={availableLeagues}
                leagueWhatIfCounts={picksWhatIfCounts?.selectedLeagues || {}}
                countryWhatIfCounts={picksCountryWhatIfCounts}
                isTickets={false}
              />

              {/* 4. Type de marché */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Type / Famille de Sélection
                  </label>
                  {picksFilters.selectedType !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, selectedType: 'ALL' }))}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Tous les types
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => ({ ...prev, selectedType: 'ALL' }))}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[34px] ${
                      picksFilters.selectedType === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Tous les types</span>
                    <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedType?.ALL ?? totalPicksCount})</span>
                  </button>
                  {availablePicksTypes.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, selectedType: t }))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[34px] ${
                        picksFilters.selectedType === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{t}</span>
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedType?.[t] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Niveau de Tier */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Niveau de Tier
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {picksWhatIfCounts?.tier?.['ALL'] ?? totalPicksCount} au total
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => ({ ...prev, tier: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-center font-bold text-xs border transition-all min-h-[34px] ${
                      picksFilters.tier === 'ALL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Tous ({picksWhatIfCounts?.tier?.['ALL'] ?? totalPicksCount})
                  </button>
                  {availableTiers.map(t => {
                    const count = picksWhatIfCounts?.tier?.[String(t)] ?? 0;
                    const isDisabled = count === 0;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setPicksFilters(prev => ({ ...prev, tier: String(t) }))}
                        className={`py-1.5 px-2.5 rounded-lg text-center font-bold text-xs border transition-all min-h-[34px] ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                            : picksFilters.tier === String(t)
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Tier {t} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Profils & Signaux Analytiques */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Signaux & Profils
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div
                    onClick={() => setPicksFilters(prev => ({ ...prev, liveOnly: !prev.liveOnly }))}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all min-h-[38px] ${
                      picksFilters.liveOnly
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5 text-xs">
                      <ShieldCheck size={13} className="text-emerald-500 shrink-0" /> Live Eligible
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.liveOnly ?? 0})</span>
                      {picksFilters.liveOnly && <Check size={13} className="text-emerald-600 font-bold" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setPicksFilters(prev => ({ ...prev, liveEstimatedOnly: !prev.liveEstimatedOnly }))}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all min-h-[38px] ${
                      picksFilters.liveEstimatedOnly
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      LIVE estimé
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.liveEstimatedOnly ?? 0})</span>
                      {picksFilters.liveEstimatedOnly && <Check size={13} className="text-emerald-600 font-bold" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setPicksFilters(prev => ({ ...prev, alphaOnly: !prev.alphaOnly }))}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all min-h-[38px] ${
                      picksFilters.alphaOnly
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5 text-xs">
                      <Zap size={13} className="text-amber-500 shrink-0" /> Alpha
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.alphaOnly ?? 0})</span>
                      {picksFilters.alphaOnly && <Check size={13} className="text-amber-600 font-bold" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setPicksFilters(prev => ({ ...prev, superSignalOnly: !prev.superSignalOnly }))}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all min-h-[38px] ${
                      picksFilters.superSignalOnly
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5 text-xs">
                      <Flame size={13} className="text-amber-500 shrink-0" /> Super Signal
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.superSignalOnly ?? 0})</span>
                      {picksFilters.superSignalOnly && <Check size={13} className="text-amber-600 font-bold" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setPicksFilters(prev => ({
                      ...prev,
                      streakStatus: prev.streakStatus === 'STREAK_CONFIRMED' ? 'ALL' : 'STREAK_CONFIRMED'
                    }))}
                    className={`p-2 rounded-xl border col-span-2 flex items-center justify-between cursor-pointer select-none transition-all min-h-[38px] ${
                      picksFilters.streakStatus === 'STREAK_CONFIRMED'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold text-xs truncate">Série Confirmée (STREAK_CONFIRMED)</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.streakStatus ?? 0})</span>
                      {picksFilters.streakStatus === 'STREAK_CONFIRMED' && <Check size={13} className="text-emerald-600 font-bold" />}
                    </div>
                  </div>
                </div>

                {/* Profils contextuels (si présents) */}
                {availablePicksProfiles.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Profils :
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setPicksFilters(prev => ({ ...prev, selectedProfile: 'ALL' }))}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all min-h-[30px] ${
                          picksFilters.selectedProfile === 'ALL'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Tous</span>
                        <span className="text-[9px] font-mono opacity-80">({picksWhatIfCounts?.selectedProfile?.ALL ?? totalPicksCount})</span>
                      </button>
                      {availablePicksProfiles.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPicksFilters(prev => ({ ...prev, selectedProfile: p }))}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all min-h-[30px] ${
                            picksFilters.selectedProfile === p
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate max-w-[120px]">{p.replace(/_/g, ' ')}</span>
                          <span className="text-[9px] font-mono opacity-80">({picksWhatIfCounts?.selectedProfile?.[p] ?? 0})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={isTickets ? onResetTicketFilters : onResetPicksFilters}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors min-h-[40px]"
          >
            <RotateCcw size={13} />
            <span>Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-xs text-center min-h-[40px] flex items-center justify-center gap-1"
          >
            <span>Voir les résultats</span>
            <span className="font-mono">({isTickets ? filteredTicketsCount : filteredPicksCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TicketFilterDrawer;
