import React from 'react';
import { X, Trophy, Ticket, ShieldCheck, Activity, Target, Flame, Scale, AlertTriangle, Layers, Filter, Check } from 'lucide-react';
import { SUPER_SIGNAL_KEYS, computeWhatIfCount } from '../../utils/filterPredicates';

export function AdvancedFilterDrawer({
  isOpen,
  onClose,
  filtersState,
  onToggleFilter,
  onResetFilters,
  baseMatches,
  filteredMatchesCount,
  activeFiltersCount,
}) {
  if (!isOpen) return null;

  const renderFilterRow = ({
    id,
    label,
    desc,
    icon,
    isActive,
    onToggle,
    whatIfCount,
  }) => {
    // A checked item can ALWAYS be unchecked (never disabled).
    // An unchecked item with whatIfCount === 0 is disabled to prevent dead-ends.
    const isDisabled = !isActive && whatIfCount === 0;

    return (
      <div
        key={id}
        onClick={() => {
          if (!isDisabled) onToggle();
        }}
        className={`
          flex items-start gap-3 p-2.5 rounded-xl border transition-all select-none
          ${isDisabled
            ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50'
            : isActive
              ? 'cursor-pointer bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-500/15 dark:border-emerald-500/50 shadow-sm'
              : 'cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
        `}
      >
        <div className={`
          mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all
          ${isActive
            ? 'bg-emerald-600 border-emerald-600 text-white'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}
        `}>
          {isActive && <Check size={12} strokeWidth={3} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
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
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className={`
        relative z-10 w-full sm:max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800
        shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200
      `}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Dimensions Analytiques
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] font-mono bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {filteredMatchesCount} match{filteredMatchesCount > 1 ? 's' : ''} correspondant{filteredMatchesCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Criteria Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

          {/* Famille 1 : Selection & Pipeline */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Trophy size={14} className="text-amber-500" />
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Selection & Pipeline
              </h3>
            </div>
            <div className="space-y-1.5">
              {renderFilterRow({
                id: 'masterPicksOnly',
                label: 'Master Picks (Choix Finaux)',
                desc: 'Sélections d\'élite retenues dans CHOIX_FINAUX',
                isActive: filtersState.masterPicksOnly,
                onToggle: () => onToggleFilter('masterPicksOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'masterPicksOnly'),
              })}
              {renderFilterRow({
                id: 'inTicketsOnly',
                label: 'Inclus dans les Tickets Assemblés',
                desc: 'Rencontres intégrées dans au moins un ticket (TICKETS_ASSEMBLES)',
                icon: <Ticket size={12} />,
                isActive: filtersState.inTicketsOnly,
                onToggle: () => onToggleFilter('inTicketsOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'inTicketsOnly'),
              })}
              {renderFilterRow({
                id: 'operationalCleanOnly',
                label: 'Operational Clean',
                desc: 'Absence de neutralisation globale (Kill-Switch inactif) & Intégrité COMPLETE',
                icon: <ShieldCheck size={12} />,
                isActive: filtersState.operationalCleanOnly,
                onToggle: () => onToggleFilter('operationalCleanOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'operationalCleanOnly'),
              })}
            </div>
          </section>

          {/* Famille 2 : Market Coverage */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Layers size={14} className="text-blue-500" />
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Couverture des Marchés
              </h3>
            </div>
            <div className="space-y-1.5">
              {renderFilterRow({
                id: 'fullPropsOnly',
                label: 'Props Statistiques Complets',
                desc: 'Projections complètes modélisées : Tirs, Cadrés et Touches (LaLiga)',
                isActive: filtersState.fullPropsOnly,
                onToggle: () => onToggleFilter('fullPropsOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'fullPropsOnly'),
              })}
              {renderFilterRow({
                id: 'market1X2UnblockedOnly',
                label: 'Marché 1X2 non soumis à un veto',
                desc: 'Probabilités 1X2 actives et non interdites par le Risk Manager',
                isActive: filtersState.market1X2UnblockedOnly,
                onToggle: () => onToggleFilter('market1X2UnblockedOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'market1X2UnblockedOnly'),
              })}
              {renderFilterRow({
                id: 'marketGoalsUnblockedOnly',
                label: 'Marché Buts (O/U 2.5) non soumis à un veto',
                desc: 'Probabilités Buts actives et marché Over 2.5 non exclu',
                isActive: filtersState.marketGoalsUnblockedOnly,
                onToggle: () => onToggleFilter('marketGoalsUnblockedOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'marketGoalsUnblockedOnly'),
              })}
            </div>
          </section>

          {/* Famille 3 : Analytical Signals */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Activity size={14} className="text-emerald-500" />
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Signaux Analytiques Moteur
              </h3>
            </div>
            <div className="space-y-1.5">
              {renderFilterRow({
                id: 'superSignalsAny',
                label: 'Super Signals : Tous',
                desc: 'Au moins un Super Signal natif V2 actif sur la rencontre',
                isActive: filtersState.superSignalsAny,
                onToggle: () => onToggleFilter('superSignalsAny'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'superSignalsAny'),
              })}

              {/* Sous-groupe OR pour les Super Signals Spécifiques */}
              <div className="ml-3 pl-3 border-l-2 border-emerald-500/20 space-y-1 py-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Sous-critères spécifiques (Union OR)
                </span>
                {SUPER_SIGNAL_KEYS.map(ss => {
                  const isSsActive = (filtersState.superSignalsSpecific || []).includes(ss.id);
                  const whatIf = computeWhatIfCount(baseMatches, filtersState, 'superSignalsSpecific', ss.id);
                  return renderFilterRow({
                    id: ss.id,
                    label: ss.label,
                    desc: ss.desc,
                    isActive: isSsActive,
                    onToggle: () => onToggleFilter('superSignalsSpecific', ss.id),
                    whatIfCount: whatIf,
                  });
                })}
              </div>

              {renderFilterRow({
                id: 'streakConfirmedOnly',
                label: 'Séries Confirmées (STREAK_CONFIRMED)',
                desc: 'Validation algorithmique des séries historiques d\'équipe',
                icon: <Target size={12} />,
                isActive: filtersState.streakConfirmedOnly,
                onToggle: () => onToggleFilter('streakConfirmedOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'streakConfirmedOnly'),
              })}
              {renderFilterRow({
                id: 'streakWarningOnly',
                label: 'Alertes de Séries (STREAK_WARNING)',
                desc: 'Conflits statistiques historiques détectés (ne vaut pas veto du Risk Manager)',
                icon: <AlertTriangle size={12} />,
                isActive: filtersState.streakWarningOnly,
                onToggle: () => onToggleFilter('streakWarningOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'streakWarningOnly'),
              })}
              {renderFilterRow({
                id: 'undervaluedTeamOnly',
                label: 'Équipe Sous-Évaluée (Justice Intelligence)',
                desc: 'Distorsion objective entre classement réel et points attendus (xPoints)',
                icon: <Scale size={12} />,
                isActive: filtersState.undervaluedTeamOnly,
                onToggle: () => onToggleFilter('undervaluedTeamOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'undervaluedTeamOnly'),
              })}
              {renderFilterRow({
                id: 'fireMomentumOnly',
                label: 'Momentum Intense (Profil Fire)',
                desc: 'Dynamique récente et volumétrie de points maximale',
                icon: <Flame size={12} />,
                isActive: filtersState.fireMomentumOnly,
                onToggle: () => onToggleFilter('fireMomentumOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'fireMomentumOnly'),
              })}
            </div>
          </section>

          {/* Famille 4 : Risk & Integrity */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <ShieldCheck size={14} className="text-rose-500" />
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                4. Risque & Gouvernance
              </h3>
            </div>
            <div className="space-y-1.5">
              {renderFilterRow({
                id: 'killSwitchActiveOnly',
                label: 'Kill-Switch Actif (Matchs Neutralisés)',
                desc: 'Probabilités 1X2 & Buts neutralisées à zéro par le Risk Manager',
                isActive: filtersState.killSwitchActiveOnly,
                onToggle: () => onToggleFilter('killSwitchActiveOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'killSwitchActiveOnly'),
              })}
              {renderFilterRow({
                id: 'hasBlockedMarketsOnly',
                label: 'Restrictions de Marché Actives',
                desc: 'Au moins un marché frappé d\'un veto spécifique (blocked_markets)',
                isActive: filtersState.hasBlockedMarketsOnly,
                onToggle: () => onToggleFilter('hasBlockedMarketsOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'hasBlockedMarketsOnly'),
              })}
              {renderFilterRow({
                id: 'falseFavoriteAlertOnly',
                label: 'Alerte Faux Favori (IS_FALSE_FAVORITE)',
                desc: 'Vulnérabilité tactique identifiée sur le favori du marché',
                isActive: filtersState.falseFavoriteAlertOnly,
                onToggle: () => onToggleFilter('falseFavoriteAlertOnly'),
                whatIfCount: computeWhatIfCount(baseMatches, filtersState, 'falseFavoriteAlertOnly'),
              })}
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onResetFilters}
            disabled={activeFiltersCount === 0}
            className={`
              px-4 py-2.5 rounded-xl text-xs font-bold transition-all border
              ${activeFiltersCount === 0
                ? 'opacity-40 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800'
                : 'text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border-slate-200 dark:border-slate-700 hover:border-rose-300'}
            `}
          >
            Tout Effacer
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md text-center"
          >
            Afficher ({filteredMatchesCount} Match{filteredMatchesCount > 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdvancedFilterDrawer;
