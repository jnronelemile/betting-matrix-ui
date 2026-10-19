import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import {
  Crosshair,
  Target,
  Flag,
  Layers,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  BarChart3,
  Ban,
  Activity,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

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

export default function TabTactical({ match, onNavigateTab }) {
  const [showCoverageDetails, setShowCoverageDetails] = useState(false);
  const [expandedCardNotes, setExpandedCardNotes] = useState({});

  const risk = match.Risk_Management_Context || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const anchors = risk.League_Anchors || {};
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

  const propBetsKeys = Object.keys(props).filter(k => k.startsWith('PROP_HOME_MORE_'));

  // Anchor configurations with exact statistical nature (médiane vs moyenne)
  const statisticalMarkets = [
    {
      key: 'corners',
      label: 'Corners',
      refKey: 'median_corners',
      refType: 'Médiane ligue',
      propKey: 'PROB_OVER_MEDIAN_CORNERS',
      lambdaKey: 'LAMBDA_CORNERS_MATCH'
    },
    {
      key: 'shots',
      label: 'Shots',
      refKey: 'median_shots',
      refType: 'Médiane ligue',
      propKey: 'PROB_OVER_MEDIAN_SHOTS',
      lambdaKey: 'LAMBDA_SHOTS_MATCH'
    },
    {
      key: 'sot',
      label: 'Shots on Target',
      refKey: 'median_sot',
      refType: 'Médiane ligue',
      propKey: 'PROB_OVER_MEDIAN_SOT',
      lambdaKey: 'LAMBDA_SOT_MATCH'
    },
    {
      key: 'throws',
      label: 'Throws',
      refKey: 'mean_throws',
      refType: 'Moyenne ligue',
      propKey: 'PROB_OVER_MEDIAN_THROWS',
      lambdaKey: 'LAMBDA_THROWS_MATCH'
    },
  ];

  const coverageSummary = React.useMemo(() => {
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

  const toggleCardNote = (key) => {
    setExpandedCardNotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasFotmobRatings = tactical.fotmob_rating_home !== undefined &&
                           tactical.fotmob_rating_away !== undefined &&
                           !tactical.MISSING_FOTMOB_DATA;

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
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <Crosshair size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Statistical Market Overview
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                Projections statistiques directes (Corners, Tirs, Cadrés, Touches) et références de ligue.
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Priorité décisionnelle
          </span>
        </div>

        {/* Compact Market Coverage Notice Summary Banner */}
        {coverageNotice && (
          <div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-2 sm:px-3 sm:py-2 transition-colors max-w-full overflow-hidden">
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

        {/* 4 Cards Grid - Compact Mobile Architecture */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statisticalMarkets.map(({ key, label, refKey, refType, propKey, lambdaKey }) => {
            const refVal = anchors[refKey] !== undefined ? anchors[refKey] : diag[refKey];
            const prob = props[propKey] !== undefined ? props[propKey] : probs[propKey];
            const lambdaVal = props[lambdaKey] !== undefined ? props[lambdaKey] : probs[lambdaKey];
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
            const isGenerated = lambdaVal !== undefined && lambdaVal !== null;
            const isNoteExpanded = !!expandedCardNotes[key];

            return (
              <div
                key={key}
                className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs min-w-0 gap-2.5"
              >
                <div>
                  {/* En-tête compact */}
                  <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200 dark:border-slate-800/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                      {label}
                    </span>
                    <Badge variant="default" className="text-[9px] px-1.5 py-0 font-mono shrink-0">
                      {refType}
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
                          {lambdaVal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0 border-x border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate w-full" title={`Référence : ${refType}`}>
                          Réf Ligue
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight">
                          {refVal !== undefined ? refVal.toFixed(2) : '-'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate w-full" title="Probabilité supérieure à la référence de ligue">
                          Prob &gt; Réf
                        </span>
                        <span className={`font-mono text-xs sm:text-sm font-black leading-tight ${getPropTextColor(prob || 0)}`}>
                          {prob !== undefined ? `${(prob * 100).toFixed(1)}%` : '-'}
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
                </div>

                {/* Qualification secondaire repliée par défaut */}
                <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
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
                    {key === 'throws' ? 'Moyenne arithmétique ligue' : 'Médiane empirique ligue'}
                  </div>
                </div>
              </div>
            );
          })}
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

                return (
                  <div key={key} className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                        {label}
                      </span>
                      <span className={`font-mono text-sm font-bold ${getPropTextColor(val)}`}>
                        {(val * 100).toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar value={val} max={1} colorClass={getPropColor(val)} displayValue=" " />
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

        {/* Tactical Ratings & Gaps */}
        <div className="lg:col-span-1">
          <Card title="Tactical Ratings & Gaps" titleIcon={<Crosshair size={16} />}>
            <div className="space-y-4 mt-1">
              {hasFotmobRatings ? (
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-widest">FotMob Ratings</span>
                    <span className="font-mono text-xs text-slate-400">Gap: {tactical.team_rating_gap?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden shadow-sm">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Home</div>
                      <div className="font-mono text-2xl text-blue-600 dark:text-blue-400 font-bold">{tactical.fotmob_rating_home?.toFixed(2)}</div>
                      {tactical.home_wastefulness_score > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/50 flex flex-col items-center">
                          <span className="text-[7px] text-rose-500 dark:text-rose-400 uppercase font-bold tracking-tighter">Wastefulness</span>
                          <span className="text-xs font-mono text-rose-600 dark:text-rose-500 font-bold">{tactical.home_wastefulness_score?.toFixed(3)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-slate-400 dark:text-slate-600 font-mono text-xs font-bold">VS</div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden shadow-sm">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Away</div>
                      <div className="font-mono text-2xl text-rose-600 dark:text-rose-400 font-bold">{tactical.fotmob_rating_away?.toFixed(2)}</div>
                      {tactical.away_wastefulness_score > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/50 flex flex-col items-center">
                          <span className="text-[7px] text-rose-500 dark:text-rose-400 uppercase font-bold tracking-tighter">Wastefulness</span>
                          <span className="text-xs font-mono text-rose-600 dark:text-rose-500 font-bold">{tactical.away_wastefulness_score?.toFixed(3)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs italic flex flex-col items-center gap-1">
                  <Flag size={16} className="opacity-40 mb-1" />
                  <span>Ratings FotMob non disponibles pour ce match</span>
                </div>
              )}

              {/* False Favorite Alert */}
              {tactical.IS_FALSE_FAVORITE && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="text-rose-600 dark:text-rose-400 shrink-0" size={16} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider leading-none">FALSE FAVORITE ALERT</span>
                      <span className="text-xs text-rose-500/80">Favori algorithmique vulnérable</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                    {tactical.false_favorite_score?.toFixed(3)}
                  </span>
                </div>
              )}

              {/* Match Openness Index */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center justify-between shadow-inner">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Match Openness Index</span>
                  <span className="text-xs text-slate-400">Degré d'ouverture offensive du match</span>
                </div>
                <span className="font-mono text-xl font-bold text-slate-800 dark:text-slate-200">
                  {tactical.match_openness_index?.toFixed(2) || 'N/A'}
                </span>
              </div>
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
                  const isGen = lambdaVal !== undefined && lambdaVal !== null;

                  return (
                    <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">
                        {label}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 text-xs">
                        {refType}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {refVal !== undefined ? refVal.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {isGen ? lambdaVal.toFixed(2) : <span className="text-slate-400 italic text-xs">Non générée</span>}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${prob !== undefined ? getPropTextColor(prob) : 'text-slate-400'}`}>
                        {prob !== undefined ? `${(prob * 100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800">
            * Indicateurs statistiques de référence algorithmique (moyennes et médianes de ligue). Ne constituent pas des lignes ou cotes bookmaker.
          </p>
        </div>
      </Card>

    </div>
  );
}
