import React from 'react';
import {
  X,
  Trophy,
  Ticket,
  ShieldCheck,
  Activity,
  Target,
  Flame,
  Scale,
  AlertTriangle,
  Layers,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import {
  SUPER_SIGNAL_KEYS,
  computeWhatIfCount,
  getActiveFilterChips
} from '../../utils/filterPredicates';

export function AdvancedFilterDrawer({
  isOpen,
  onClose,
  filtersState,
  onToggleFilter,
  onResetFilters,
  baseMatches = [],
  filteredMatchesCount = 0,
  activeFiltersCount = 0,
}) {
  // États de dépliage des sections secondaires (toujours appelés de manière inconditionnelle)
  const [openComplementaires, setOpenComplementaires] = React.useState(false);
  const [openRisk, setOpenRisk] = React.useState(false);
  const [openDiagnostic, setOpenDiagnostic] = React.useState(false);

  const safeFilters = filtersState || {};

  // Pastilles de filtres actifs pour suppression rapide
  const activeChips = React.useMemo(
    () => getActiveFilterChips(safeFilters),
    [safeFilters]
  );

  // Compteurs d'activation par section (garantit qu'aucun critère actif n'est masqué)
  const priorityActiveCount = React.useMemo(() => {
    let count = 0;
    if (safeFilters.masterPicksOnly) count++;
    if (safeFilters.inTicketsOnly) count++;
    if (safeFilters.superSignalsAny) count++;
    if (Array.isArray(safeFilters.superSignalsSpecific)) count += safeFilters.superSignalsSpecific.length;
    if (safeFilters.streakConfirmedOnly) count++;
    if (safeFilters.undervaluedTeamOnly) count++;
    if (safeFilters.fireMomentumOnly) count++;
    return count;
  }, [safeFilters]);

  const complementairesActiveCount = React.useMemo(() => {
    let count = 0;
    if (safeFilters.market1X2UnblockedOnly) count++;
    if (safeFilters.marketGoalsUnblockedOnly) count++;
    if (safeFilters.streakWarningOnly) count++;
    return count;
  }, [safeFilters]);

  const riskActiveCount = React.useMemo(() => {
    let count = 0;
    if (safeFilters.operationalCleanOnly) count++;
    if (safeFilters.killSwitchActiveOnly) count++;
    if (safeFilters.hasBlockedMarketsOnly) count++;
    if (safeFilters.falseFavoriteAlertOnly) count++;
    return count;
  }, [safeFilters]);

  const diagnosticActiveCount = React.useMemo(() => {
    return safeFilters.fullPropsOnly ? 1 : 0;
  }, [safeFilters]);

  // Garde d'ouverture placée strictement après tous les hooks React
  if (!isOpen) return null;

  // Une section repliable reste obligatoirement ouverte tant qu'au moins un de ses critères est actif
  const isComplementairesExpanded = openComplementaires || complementairesActiveCount > 0;
  const isRiskExpanded = openRisk || riskActiveCount > 0;
  const isDiagnosticExpanded = openDiagnostic || diagnosticActiveCount > 0;

  const renderFilterRow = ({
    id,
    label,
    desc,
    icon,
    isActive,
    onToggle,
    whatIfCount,
    compact = false,
  }) => {
    // Un critère actif peut TOUJOURS être décoché.
    // Un critère inactif dont le whatIfCount vaut 0 est désactivé pour éviter les impasses.
    const isDisabled = !isActive && whatIfCount === 0;

    return (
      <div
        key={id}
        role="checkbox"
        aria-checked={Boolean(isActive)}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
        title={desc || label}
        onClick={() => {
          if (!isDisabled) onToggle();
        }}
        onKeyDown={(e) => {
          if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`
          flex items-start gap-2.5 ${compact ? 'p-2' : 'p-2.5'} rounded-xl border transition-all select-none
          ${isDisabled
            ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50'
            : isActive
              ? 'cursor-pointer bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-500/15 dark:border-emerald-500/50 shadow-2xs'
              : 'cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
        `}
      >
        <div className={`
          mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all
          ${isActive
            ? 'bg-emerald-600 border-emerald-600 text-white'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}
        `}>
          {isActive && <Check size={11} strokeWidth={3} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {icon && <span className="text-slate-500 dark:text-slate-400 shrink-0">{icon}</span>}
              <span className={`text-xs font-bold truncate ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                {label}
              </span>
            </div>

            <span className={`
              text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 border
              ${isActive
                ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold'
                : isDisabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}
            `}>
              {isActive ? `Actif (${filteredMatchesCount})` : `(${whatIfCount})`}
            </span>
          </div>

          {desc && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
              {desc}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className={`
        relative z-10 w-full sm:max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800
        shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200
      `}>
        {/* Header Compact */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Filter size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Filtres Analytiques Matrice
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] font-mono bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {filteredMatchesCount} match{filteredMatchesCount > 1 ? 's' : ''} sur {baseMatches.length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bandeau récapitulatif des filtres actifs (suppression unitaire et réinitialisation immédiate) */}
        {activeChips.length > 0 && (
          <div className="px-4 py-2 bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-emerald-500/20 flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mr-0.5">
              Actifs :
            </span>
            {activeChips.map(chip => (
              <button
                key={chip.subKey ? `${chip.key}-${chip.subKey}` : chip.key}
                type="button"
                onClick={() => onToggleFilter(chip.key, chip.subKey)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-500/30 transition-colors"
                title={`Retirer le filtre ${chip.label}`}
              >
                <span>{chip.label}</span>
                <X size={10} />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetFilters}
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
            >
              <RotateCcw size={10} />
              <span>Réinitialiser</span>
            </button>
          </div>
        )}

        {/* Scrollable Criteria Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">

          {/* SECTION 1 — FILTRES PRIORITAIRES (Immédiatement accessibles) */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Trophy size={13} className="text-amber-500" />
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  1. Filtres Prioritaires
                </h3>
              </div>
              {priorityActiveCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {priorityActiveCount} actif{priorityActiveCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {renderFilterRow({
                id: 'masterPicksOnly',
                label: 'Master Picks (Choix Finaux)',
                desc: 'Sélections d\'élite retenues dans CHOIX_FINAUX',
                icon: <Trophy size={12} className="text-amber-500" />,
                isActive: safeFilters.masterPicksOnly,
                onToggle: () => onToggleFilter('masterPicksOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'masterPicksOnly'),
              })}

              {renderFilterRow({
                id: 'inTicketsOnly',
                label: 'Inclus dans les Tickets Assemblés',
                desc: 'Rencontres intégrées dans au moins un ticket (TICKETS_ASSEMBLES)',
                icon: <Ticket size={12} className="text-blue-500" />,
                isActive: safeFilters.inTicketsOnly,
                onToggle: () => onToggleFilter('inTicketsOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'inTicketsOnly'),
              })}

              {renderFilterRow({
                id: 'superSignalsAny',
                label: 'Super Signals : Tous',
                desc: 'Au moins un Super Signal natif V2 actif sur la rencontre',
                icon: <Activity size={12} className="text-emerald-500" />,
                isActive: safeFilters.superSignalsAny,
                onToggle: () => onToggleFilter('superSignalsAny'),
                whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'superSignalsAny'),
              })}

              {/* Sous-groupe OR pour les 4 Super Signals Spécifiques */}
              <div className="ml-2 pl-2.5 border-l-2 border-emerald-500/25 space-y-1.5 py-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Super Signals spécifiques (Union OR)
                  </span>
                  {(safeFilters.superSignalsSpecific || []).length > 0 && (
                    <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {(safeFilters.superSignalsSpecific || []).length}/4 sélectionné{(safeFilters.superSignalsSpecific || []).length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SUPER_SIGNAL_KEYS.map(ss => {
                    const isSsActive = (safeFilters.superSignalsSpecific || []).includes(ss.id);
                    const whatIf = computeWhatIfCount(baseMatches, safeFilters, 'superSignalsSpecific', ss.id);
                    return renderFilterRow({
                      id: ss.id,
                      label: ss.label,
                      desc: ss.desc,
                      isActive: isSsActive,
                      onToggle: () => onToggleFilter('superSignalsSpecific', ss.id),
                      whatIfCount: whatIf,
                      compact: true,
                    });
                  })}
                </div>
              </div>

              {renderFilterRow({
                id: 'streakConfirmedOnly',
                label: 'Séries Confirmées (STREAK_CONFIRMED)',
                desc: 'Validation algorithmique des séries historiques d\'équipe',
                icon: <Target size={12} className="text-emerald-500" />,
                isActive: safeFilters.streakConfirmedOnly,
                onToggle: () => onToggleFilter('streakConfirmedOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'streakConfirmedOnly'),
              })}

              {renderFilterRow({
                id: 'undervaluedTeamOnly',
                label: 'Équipe Sous-Évaluée (Justice Intelligence)',
                desc: 'Distorsion objective entre classement réel et points attendus (xPoints)',
                icon: <Scale size={12} className="text-indigo-500" />,
                isActive: safeFilters.undervaluedTeamOnly,
                onToggle: () => onToggleFilter('undervaluedTeamOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'undervaluedTeamOnly'),
              })}

              {renderFilterRow({
                id: 'fireMomentumOnly',
                label: 'Momentum Intense (Profil Fire)',
                desc: 'Dynamique récente et volumétrie de points maximale',
                icon: <Flame size={12} className="text-orange-500" />,
                isActive: safeFilters.fireMomentumOnly,
                onToggle: () => onToggleFilter('fireMomentumOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'fireMomentumOnly'),
              })}
            </div>
          </section>

          {/* SECTION 2 — FILTRES COMPLÉMENTAIRES (Repliable, auto-ouvert si actif) */}
          <section className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenComplementaires(prev => !prev)}
              className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Layers size={13} className="text-blue-500 shrink-0" />
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  2. Filtres Complémentaires
                </h3>
                {complementairesActiveCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {complementairesActiveCount} actif{complementairesActiveCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <span>{isComplementairesExpanded ? 'Masquer' : '3 critères'}</span>
                {isComplementairesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {isComplementairesExpanded && (
              <div className="p-2.5 pt-1 space-y-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                {renderFilterRow({
                  id: 'market1X2UnblockedOnly',
                  label: 'Marché 1X2 non soumis à un veto',
                  desc: 'Probabilités 1X2 actives et non interdites par le Risk Manager',
                  isActive: safeFilters.market1X2UnblockedOnly,
                  onToggle: () => onToggleFilter('market1X2UnblockedOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'market1X2UnblockedOnly'),
                  compact: true,
                })}

                {renderFilterRow({
                  id: 'marketGoalsUnblockedOnly',
                  label: 'Marché Buts (O/U 2.5) non soumis à un veto',
                  desc: 'Probabilités Buts actives et marché Over 2.5 non exclu',
                  isActive: safeFilters.marketGoalsUnblockedOnly,
                  onToggle: () => onToggleFilter('marketGoalsUnblockedOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'marketGoalsUnblockedOnly'),
                  compact: true,
                })}

                {renderFilterRow({
                  id: 'streakWarningOnly',
                  label: 'Alertes de Séries (STREAK_WARNING)',
                  desc: 'Conflits statistiques historiques détectés (ne vaut pas veto du Risk Manager)',
                  icon: <AlertTriangle size={12} className="text-amber-500" />,
                  isActive: safeFilters.streakWarningOnly,
                  onToggle: () => onToggleFilter('streakWarningOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'streakWarningOnly'),
                  compact: true,
                })}
              </div>
            )}
          </section>

          {/* SECTION 3 — RISQUE ET GOUVERNANCE (Repliable, auto-ouvert si actif) */}
          <section className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenRisk(prev => !prev)}
              className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-rose-500 shrink-0" />
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  3. Risque & Gouvernance
                </h3>
                {riskActiveCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {riskActiveCount} actif{riskActiveCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <span>{isRiskExpanded ? 'Masquer' : '4 critères'}</span>
                {isRiskExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {isRiskExpanded && (
              <div className="p-2.5 pt-1 space-y-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                  Operational Clean et Kill-Switch Actif sont mutuellement exclusifs.
                </p>

                {renderFilterRow({
                  id: 'operationalCleanOnly',
                  label: 'Operational Clean',
                  desc: 'Absence de neutralisation globale (Kill-Switch inactif) & Intégrité COMPLETE',
                  icon: <ShieldCheck size={12} className="text-emerald-500" />,
                  isActive: safeFilters.operationalCleanOnly,
                  onToggle: () => onToggleFilter('operationalCleanOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'operationalCleanOnly'),
                  compact: true,
                })}

                {renderFilterRow({
                  id: 'killSwitchActiveOnly',
                  label: 'Kill-Switch Actif (Matchs Neutralisés)',
                  desc: 'Probabilités 1X2 & Buts neutralisées à zéro par le Risk Manager',
                  icon: <AlertTriangle size={12} className="text-rose-500" />,
                  isActive: safeFilters.killSwitchActiveOnly,
                  onToggle: () => onToggleFilter('killSwitchActiveOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'killSwitchActiveOnly'),
                  compact: true,
                })}

                {renderFilterRow({
                  id: 'hasBlockedMarketsOnly',
                  label: 'Restrictions de Marché Actives',
                  desc: 'Au moins un marché frappé d\'un veto spécifique (blocked_markets)',
                  isActive: safeFilters.hasBlockedMarketsOnly,
                  onToggle: () => onToggleFilter('hasBlockedMarketsOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'hasBlockedMarketsOnly'),
                  compact: true,
                })}

                {renderFilterRow({
                  id: 'falseFavoriteAlertOnly',
                  label: 'Alerte Faux Favori (IS_FALSE_FAVORITE)',
                  desc: 'Vulnérabilité tactique identifiée sur le favori du marché',
                  isActive: safeFilters.falseFavoriteAlertOnly,
                  onToggle: () => onToggleFilter('falseFavoriteAlertOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'falseFavoriteAlertOnly'),
                  compact: true,
                })}
              </div>
            )}
          </section>

          {/* SECTION 4 — DIAGNOSTIC AVANCÉ (Repliable, auto-ouvert si actif) */}
          <section className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenDiagnostic(prev => !prev)}
              className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-purple-500 shrink-0" />
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  4. Diagnostic Avancé
                </h3>
                {diagnosticActiveCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    1 actif
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <span>{isDiagnosticExpanded ? 'Masquer' : 'Couverture Props'}</span>
                {isDiagnosticExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {isDiagnosticExpanded && (
              <div className="p-2.5 pt-1 space-y-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                {renderFilterRow({
                  id: 'fullPropsOnly',
                  label: 'Props Statistiques Complets (SHOTS / SOT / THROWS)',
                  desc: 'Couverture complète des projections statistiques modélisées : SHOTS, SOT et THROWS',
                  isActive: safeFilters.fullPropsOnly,
                  onToggle: () => onToggleFilter('fullPropsOnly'),
                  whatIfCount: computeWhatIfCount(baseMatches, safeFilters, 'fullPropsOnly'),
                  compact: true,
                })}
              </div>
            )}
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onResetFilters}
            disabled={activeFiltersCount === 0}
            className={`
              inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border min-h-[40px]
              ${activeFiltersCount === 0
                ? 'opacity-40 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800'
                : 'text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border-slate-200 dark:border-slate-700 hover:border-rose-300'}
            `}
          >
            <RotateCcw size={13} />
            <span>Tout Effacer</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs text-center min-h-[40px]"
          >
            Afficher ({filteredMatchesCount} Match{filteredMatchesCount > 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdvancedFilterDrawer;
