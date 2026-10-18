import React from 'react';
import {
  X,
  Filter,
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
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import {
  LEAGUE_GROUPS,
  PRODUCT_FAMILIES,
  TIME_SLOTS,
  hasActiveLegCriteria,
  formatDateDisplay,
  computeTicketWhatIfCounts,
  computePickWhatIfCounts,
  pickPassesFilters,
  SCOPE_TYPE_LABELS,
  getScopeTypeLabel
} from '../../utils/ticketFilters.js';
import { getLeagueFlag } from '../../utils/titaniumLoader.js';

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
  isTicketLive
}) {
  if (!isOpen) return null;

  const isTickets = tab === 'strategies';

  const handleToggleLeagueTicket = (league) => {
    setTicketFilters(prev => {
      const current = prev.selectedLeagues || [];
      const exists = current.includes(league);
      const next = exists ? current.filter(l => l !== league) : [...current, league];
      return { ...prev, selectedLeagues: next };
    });
  };

  const handleToggleMarketFamily = (family) => {
    setTicketFilters(prev => {
      const current = prev.selectedMarketFamilies || [];
      const exists = current.includes(family);
      const next = exists ? current.filter(f => f !== family) : [...current, family];
      return { ...prev, selectedMarketFamilies: next };
    });
  };

  const handleToggleLeaguePick = (league) => {
    setPicksFilters(prev => {
      const current = prev.selectedLeagues || [];
      const exists = current.includes(league);
      const next = exists ? current.filter(l => l !== league) : [...current, league];
      return { ...prev, selectedLeagues: next };
    });
  };

  // Détermination des tickets candidats en respectant le filtre LIVE estimé si actif
  const candidateTickets = React.useMemo(() => {
    if (!ticketFilters?.liveEstimatedOnly || typeof isTicketLive !== 'function') return tickets;
    return tickets.filter(t => isTicketLive(t));
  }, [tickets, ticketFilters?.liveEstimatedOnly, isTicketLive]);

  // 1. Découverte dynamique de tous les Tiers existants dans les choix finaux (D-1)
  const availableTiers = React.useMemo(() => {
    const set = new Set([1, 2, 3]); // Socle standard TITANIUM
    (picks || []).forEach(p => {
      const t = typeof p.Tier === 'number' ? p.Tier : parseInt(p.Tier, 10);
      if (!isNaN(t)) set.add(t);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [picks]);

  // 2. Compteurs prospectifs what-if pour les tickets (D-3 & WEB-001-D)
  const ticketWhatIfCounts = React.useMemo(() => {
    if (!isTickets || !Array.isArray(candidateTickets) || candidateTickets.length === 0) return null;
    return {
      structure: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'structure', ['ALL', 'SINGLES', 'COMBOS']),
      productCode: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'productCode', [
        'ALL',
        'MICRO_2',
        'CORE_3',
        'CORE_4',
        'STANDARD_5_8',
        'EXTENDED_9_PLUS'
      ]),
      legMatchMode: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'legMatchMode', [
        'ANY',
        'AT_LEAST_2',
        'AT_LEAST_3',
        'CUSTOM',
        'ALL'
      ]),
      leagueGroup: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'leagueGroup', [
        'ALL',
        ...Object.keys(LEAGUE_GROUPS),
        'AUTRES_LIGUES'
      ]),
      selectedLeagues: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'selectedLeagues', availableLeagues),
      selectedMarketFamilies: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'selectedMarketFamilies', availableMarketFamilies),
      selectedDate: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'selectedDate', ['ALL', ...availableDates]),
      timeSlot: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'timeSlot', ['ALL', 'MATIN', 'APRES_MIDI', 'SOIR', 'NUIT']),
      minProbThreshold: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'minProbThreshold', [0, 0.70, 0.75, 0.80, 0.85]),
      scopeType: computeTicketWhatIfCounts(candidateTickets, ticketFilters, 'scopeType', ['ALL', 'FULL_POOL', 'LEAGUE_SCOPED', 'COMPOUND_SCOPE'])
    };
  }, [isTickets, candidateTickets, ticketFilters, availableLeagues, availableMarketFamilies, availableDates]);

  // 3. Compteurs prospectifs what-if pour les Choix Finaux (D-3 & WEB-001-D)
  const picksWhatIfCounts = React.useMemo(() => {
    if (isTickets || !Array.isArray(picks) || picks.length === 0) return null;
    return {
      tier: computePickWhatIfCounts(picks, picksFilters, 'tier', ['ALL', ...availableTiers.map(String)]),
      leagueGroup: computePickWhatIfCounts(picks, picksFilters, 'leagueGroup', [
        'ALL',
        ...Object.keys(LEAGUE_GROUPS),
        'AUTRES_LIGUES'
      ]),
      selectedLeagues: computePickWhatIfCounts(picks, picksFilters, 'selectedLeagues', availableLeagues),
      selectedType: computePickWhatIfCounts(picks, picksFilters, 'selectedType', ['ALL', ...availablePicksTypes]),
      selectedProfile: computePickWhatIfCounts(picks, picksFilters, 'selectedProfile', ['ALL', ...availablePicksProfiles]),
      selectedDate: computePickWhatIfCounts(picks, picksFilters, 'selectedDate', ['ALL', ...availableDates]),
      timeSlot: computePickWhatIfCounts(picks, picksFilters, 'timeSlot', ['ALL', 'MATIN', 'APRES_MIDI', 'SOIR', 'NUIT']),
      alphaOnly: picks.filter(p => pickPassesFilters(p, { ...picksFilters, alphaOnly: true })).length,
      superSignalOnly: picks.filter(p => pickPassesFilters(p, { ...picksFilters, superSignalOnly: true })).length,
      liveOnly: picks.filter(p => pickPassesFilters(p, { ...picksFilters, liveOnly: true })).length,
      streakStatus: picks.filter(p => pickPassesFilters(p, { ...picksFilters, streakStatus: 'STREAK_CONFIRMED' })).length
    };
  }, [isTickets, picks, picksFilters, availableTiers, availableLeagues, availablePicksTypes, availablePicksProfiles, availableDates]);


  return (
    <div className="fixed inset-0 z-[70] flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative z-10 w-full sm:max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Filtres Avancés
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isTickets ? (
                  <span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{filteredTicketsCount}</strong> sur <span className="font-mono">{totalTicketsCount}</span> tickets correspondants
                  </span>
                ) : (
                  <span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">{filteredPicksCount}</strong> sur <span className="font-mono">{totalPicksCount}</span> choix correspondants
                  </span>
                )}
              </p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 custom-scrollbar text-xs">
          {isTickets ? (
            /* =========================================================================
             * SECTION TICKETS ASSEMBLÉS
             * ========================================================================= */
            <>
              {/* 1. Structure & Familles de Combinés */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers size={13} className="text-emerald-500" /> Structure du Ticket
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
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
                        className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                          ticketFilters.structure === opt.id && (opt.id !== 'COMBOS' || ticketFilters.productCode === 'ALL')
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] font-mono opacity-80">({opt.count})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1.bis Familles de combinés */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-sky-500" /> Familles de Combinés
                    </span>
                    {ticketFilters.productCode !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setTicketFilters(prev => ({ ...prev, productCode: 'ALL' }))}
                        className="text-[11px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                      >
                        Toutes les familles
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
                          className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-between gap-1 text-left ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
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

              {/* 2. Correspondance des jambes */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" /> Correspondance des jambes
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Multi-jambes</span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  Pour qu&apos;un ticket combiné soit retenu, ses critères de <strong>ligue</strong>, <strong>marché</strong>, <strong>groupe</strong> et <strong>date</strong> doivent être satisfaits par les jambes correspondantes :
                </p>

                {/* Neutralisation si aucun critère relatif aux jambes n'est actif */}
                {!hasActiveLegCriteria(ticketFilters) && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0 text-amber-500" />
                    <span>Aucun critère de jambe actif (ligue, marché ou date). Le mode est neutralisé et s&apos;appliquera dès l&apos;activation d&apos;un filtre de jambe.</span>
                  </div>
                )}

                {/* Explication comparative claire des modes */}
                <div className="space-y-1.5 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">• Au moins une jambe :</span>
                    <span>Le ticket est conservé dès qu&apos;au moins une jambe valide l&apos;ensemble de vos critères actifs.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-sky-600 dark:text-sky-400 shrink-0">• Au moins N jambes :</span>
                    <span>Seuil quantitatif où un combiné doit compter un nombre minimum de jambes satisfaisant les critères.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">• Toutes les jambes :</span>
                    <span>Correspondance stricte : chaque jambe du ticket sans exception doit satisfaire vos critères.</span>
                  </div>
                </div>

                {/* Sélecteur des modes de filtrage actifs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'ANY' }))}
                    className={`py-2 px-2.5 rounded-lg font-bold text-xs border transition-all text-left flex items-center justify-between ${
                      ticketFilters.legMatchMode === 'ANY'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">Au moins 1</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.legMatchMode?.['ANY'] ?? filteredTicketsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'AT_LEAST_2' }))}
                    className={`py-2 px-2.5 rounded-lg font-bold text-xs border transition-all text-left flex items-center justify-between ${
                      ticketFilters.legMatchMode === 'AT_LEAST_2'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">Au moins 2</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.legMatchMode?.['AT_LEAST_2'] ?? 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'AT_LEAST_3' }))}
                    className={`py-2 px-2.5 rounded-lg font-bold text-xs border transition-all text-left flex items-center justify-between ${
                      ticketFilters.legMatchMode === 'AT_LEAST_3'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">Au moins 3</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.legMatchMode?.['AT_LEAST_3'] ?? 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'CUSTOM', minLegsMatching: prev.minLegsMatching || 2 }))}
                    className={`py-2 px-2.5 rounded-lg font-bold text-xs border transition-all text-left flex items-center justify-between ${
                      ticketFilters.legMatchMode === 'CUSTOM'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">Au moins N</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.legMatchMode?.['CUSTOM'] ?? 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, legMatchMode: 'ALL' }))}
                    className={`py-2 px-2.5 rounded-lg font-bold text-xs border transition-all text-left flex items-center justify-between sm:col-span-2 ${
                      ticketFilters.legMatchMode === 'ALL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">Toutes les jambes (ALL)</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.legMatchMode?.['ALL'] ?? 0})</span>
                  </button>
                </div>

                {/* Configuration interactive du seuil N lorsque le mode CUSTOM est actif */}
                {ticketFilters.legMatchMode === 'CUSTOM' && (
                  <div className="p-3 rounded-lg bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Seuil minimum de jambes correspondantes (N) :
                      </span>
                      <span className="text-sm font-mono font-black text-sky-600 dark:text-sky-400">
                        ≥ {ticketFilters.minLegsMatching || 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setTicketFilters(prev => ({ ...prev, minLegsMatching: Math.max(1, (prev.minLegsMatching || 1) - 1) }))}
                          className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-100"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => setTicketFilters(prev => ({ ...prev, minLegsMatching: Math.min(12, (prev.minLegsMatching || 1) + 1) }))}
                          className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Un combiné ayant moins de {ticketFilters.minLegsMatching || 1} jambes totales est automatiquement exclu.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Groupe de Ligues */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe size={13} className="text-purple-500" /> Groupe de Ligues
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, leagueGroup: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                      ticketFilters.leagueGroup === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Tous les groupes</span>
                    <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.leagueGroup?.['ALL'] ?? totalTicketsCount})</span>
                  </button>
                  {Object.values(LEAGUE_GROUPS).map(grp => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, leagueGroup: grp.id }))}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1 truncate ${
                        ticketFilters.leagueGroup === grp.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                      title={grp.description}
                    >
                      <span className="truncate">{grp.label}</span>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.leagueGroup?.[grp.id] ?? 0})</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, leagueGroup: 'AUTRES_LIGUES' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                      ticketFilters.leagueGroup === 'AUTRES_LIGUES'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">Autres Ligues</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.leagueGroup?.['AUTRES_LIGUES'] ?? 0})</span>
                  </button>
                </div>
              </div>

              {/* 4. Sélection spécifique de Ligues (Multi-select) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ligues Spécifiques ({ticketFilters.selectedLeagues?.length || 0} active{ticketFilters.selectedLeagues?.length > 1 ? 's' : ''})
                  </label>
                  {ticketFilters.selectedLeagues?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, selectedLeagues: [] }))}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
                  {availableLeagues.map(league => {
                    const isSelected = ticketFilters.selectedLeagues?.includes(league);
                    const count = ticketWhatIfCounts?.selectedLeagues?.[league] ?? 0;
                    return (
                      <button
                        key={league}
                        type="button"
                        onClick={() => handleToggleLeagueTicket(league)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span>{getLeagueFlag(league)}</span>
                        <span>{league}</span>
                        <span className="text-[10px] font-mono opacity-80">({count})</span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Famille de marché dans les jambes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Famille de Marché ({ticketFilters.selectedMarketFamilies?.length || 0} active{ticketFilters.selectedMarketFamilies?.length > 1 ? 's' : ''})
                  </label>
                  {ticketFilters.selectedMarketFamilies?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, selectedMarketFamilies: [] }))}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Effacer
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span>{fam}</span>
                        <span className="text-[10px] font-mono opacity-80">({count})</span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Date du match */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-sky-500" /> Date du Match
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, selectedDate: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                      ticketFilters.selectedDate === 'ALL'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Toutes les dates</span>
                    <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.selectedDate?.['ALL'] ?? totalTicketsCount})</span>
                  </button>
                  {availableDates.map(dateStr => (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, selectedDate: dateStr }))}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                        ticketFilters.selectedDate === dateStr
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{formatDateDisplay(dateStr)}</span>
                      <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.selectedDate?.[dateStr] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Créneaux horaires */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-500" /> Créneaux Horaires
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTicketFilters(prev => ({ ...prev, timeSlot: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                      (ticketFilters.timeSlot || 'ALL') === 'ALL'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Tous</span>
                    <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.timeSlot?.['ALL'] ?? candidateTickets.length})</span>
                  </button>
                  {Object.values(TIME_SLOTS).map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setTicketFilters(prev => ({ ...prev, timeSlot: slot.id }))}
                      title={`${slot.label} (${slot.hoursRange}) : ${slot.description}`}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                        ticketFilters.timeSlot === slot.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="truncate">{slot.label}</span>
                        <span className="text-[9px] font-mono opacity-70 truncate">{slot.hoursRange}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">({ticketWhatIfCounts?.timeSlot?.[slot.id] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 7. Seuil de probabilité minimale */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Percent size={13} className="text-emerald-500" /> Seuil Prob. Min. d&apos;une jambe
                </label>
                <div className="grid grid-cols-5 gap-1.5">
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
                      className={`py-1.5 px-1 rounded-lg text-center text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                        ticketFilters.minProbThreshold === lvl.val
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{lvl.label}</span>
                      <span className="text-[10px] font-mono opacity-80">({ticketWhatIfCounts?.minProbThreshold?.[lvl.val] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 8. Périmètre d'assemblage (scope_type) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-500" /> Périmètre d&apos;assemblage
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {ticketFilters.scopeType !== 'ALL' ? ticketFilters.scopeType : 'Scope'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Définit le champ de composition appliqué par le moteur lors de l&apos;assemblage des sélections.
                </p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[
                    { id: 'ALL', label: 'Tous les périmètres', canonical: 'ALL' },
                    { id: 'FULL_POOL', label: 'Pool général', canonical: 'FULL_POOL' },
                    { id: 'LEAGUE_SCOPED', label: 'Par ligue', canonical: 'LEAGUE_SCOPED' },
                    { id: 'COMPOUND_SCOPE', label: 'Ligue + date', canonical: 'COMPOUND_SCOPE' }
                  ].map(opt => {
                    const isSelected = ticketFilters.scopeType === opt.id;
                    const count = ticketWhatIfCounts?.scopeType?.[opt.id] ?? 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTicketFilters(prev => ({ ...prev, scopeType: opt.id }))}
                        className={`py-2 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                        title={opt.canonical !== 'ALL' ? `Valeur canonique : ${opt.canonical}` : 'Tous les périmètres'}
                      >
                        <span className="truncate">{opt.label}</span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* =========================================================================
             * SECTION CHOIX FINAUX (CHOIX_FINAUX)
             * ========================================================================= */
            <>
              {/* 1. Tier (D-1 dynamique) */}
              <div className="space-y-2">
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
                    className={`py-1.5 px-2.5 rounded-lg text-center font-bold text-xs border transition-all ${
                      picksFilters.tier === 'ALL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
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
                        className={`py-1.5 px-2.5 rounded-lg text-center font-bold text-xs border transition-all ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                            : picksFilters.tier === String(t)
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Tier {t} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Groupe de Ligues */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe size={13} className="text-purple-500" /> Groupe de Ligues
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => ({ ...prev, leagueGroup: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                      picksFilters.leagueGroup === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Tous les groupes</span>
                    <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.leagueGroup?.['ALL'] ?? totalPicksCount})</span>
                  </button>
                  {Object.values(LEAGUE_GROUPS).map(grp => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, leagueGroup: grp.id }))}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1 truncate ${
                        picksFilters.leagueGroup === grp.id
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{grp.label}</span>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">({picksWhatIfCounts?.leagueGroup?.[grp.id] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Ligues individuelles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ligues Sélectionnées ({picksFilters.selectedLeagues?.length || 0})
                  </label>
                  {picksFilters.selectedLeagues?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, selectedLeagues: [] }))}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
                  {availableLeagues.map(league => {
                    const isSelected = picksFilters.selectedLeagues?.includes(league);
                    const count = picksWhatIfCounts?.selectedLeagues?.[league] ?? 0;
                    return (
                      <button
                        key={league}
                        type="button"
                        onClick={() => handleToggleLeaguePick(league)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span>{getLeagueFlag(league)}</span>
                        <span>{league}</span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">({count})</span>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Type de marché */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Type / Famille de Sélection
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => ({ ...prev, selectedType: 'ALL' }))}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      picksFilters.selectedType === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600'
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        picksFilters.selectedType === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{t}</span>
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedType?.[t] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Profils contextuels */}
              {availablePicksProfiles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Profil Contextuel (Profile)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, selectedProfile: 'ALL' }))}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        picksFilters.selectedProfile === 'ALL'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>Tous les profils</span>
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedProfile?.ALL ?? totalPicksCount})</span>
                    </button>
                    {availablePicksProfiles.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPicksFilters(prev => ({ ...prev, selectedProfile: p }))}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          picksFilters.selectedProfile === p
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{p.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedProfile?.[p] ?? 0})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Signaux Analytiques */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Signaux Analytiques
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setPicksFilters(prev => ({ ...prev, alphaOnly: !prev.alphaOnly }))}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                      picksFilters.alphaOnly
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap size={13} className="text-amber-500" /> Alpha
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.alphaOnly ?? 0})</span>
                      {picksFilters.alphaOnly && <Check size={14} className="text-amber-600 font-bold" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setPicksFilters(prev => ({ ...prev, superSignalOnly: !prev.superSignalOnly }))}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                      picksFilters.superSignalOnly
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <Flame size={13} className="text-amber-500" /> Super Signal
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.superSignalOnly ?? 0})</span>
                      {picksFilters.superSignalOnly && <Check size={14} className="text-amber-600 font-bold" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setPicksFilters(prev => ({ ...prev, liveOnly: !prev.liveOnly }))}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                      picksFilters.liveOnly
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-emerald-500" /> Live Eligible
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.liveOnly ?? 0})</span>
                      {picksFilters.liveOnly && <Check size={14} className="text-emerald-600 font-bold" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setPicksFilters(prev => ({
                      ...prev,
                      streakStatus: prev.streakStatus === 'STREAK_CONFIRMED' ? 'ALL' : 'STREAK_CONFIRMED'
                    }))}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                      picksFilters.streakStatus === 'STREAK_CONFIRMED'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-bold">Série Confirmée</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.streakStatus ?? 0})</span>
                      {picksFilters.streakStatus === 'STREAK_CONFIRMED' && <Check size={14} className="text-emerald-600 font-bold" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. Date du match */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-sky-500" /> Date du Match
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => ({ ...prev, selectedDate: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                      picksFilters.selectedDate === 'ALL'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Toutes les dates</span>
                    <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedDate?.ALL ?? totalPicksCount})</span>
                  </button>
                  {availableDates.map(dateStr => (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, selectedDate: dateStr }))}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                        picksFilters.selectedDate === dateStr
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{formatDateDisplay(dateStr)}</span>
                      <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.selectedDate?.[dateStr] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Créneaux horaires */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-500" /> Créneaux Horaires
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPicksFilters(prev => ({ ...prev, timeSlot: 'ALL' }))}
                    className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                      (picksFilters.timeSlot || 'ALL') === 'ALL'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Tous</span>
                    <span className="text-[10px] font-mono opacity-80">({picksWhatIfCounts?.timeSlot?.['ALL'] ?? totalPicksCount})</span>
                  </button>
                  {Object.values(TIME_SLOTS).map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setPicksFilters(prev => ({ ...prev, timeSlot: slot.id }))}
                      title={`${slot.label} (${slot.hoursRange}) : ${slot.description}`}
                      className={`py-1.5 px-2.5 rounded-lg text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                        picksFilters.timeSlot === slot.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="truncate">{slot.label}</span>
                        <span className="text-[9px] font-mono opacity-70 truncate">{slot.hoursRange}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">({picksWhatIfCounts?.timeSlot?.[slot.id] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={isTickets ? onResetTicketFilters : onResetPicksFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw size={14} />
            <span>Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm text-center"
          >
            Voir les résultats ({isTickets ? filteredTicketsCount : filteredPicksCount})
          </button>
        </div>
      </div>
    </div>
  );
}
export default TicketFilterDrawer;
