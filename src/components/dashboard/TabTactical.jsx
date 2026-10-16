import React from 'react';
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
  Activity
} from 'lucide-react';

export default function TabTactical({ match, onNavigateTab }) {
  const risk = match.Risk_Management_Context || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const anchors = risk.League_Anchors || {};
  const props = match.Prop_Bets || {};
  const probs = match.True_Probabilities || {};
  const diag = match.Calibration_Diagnostics || {};
  const investSignals = risk.Investment_Signals || {};
  const operational = risk.Operational_Restrictions || {};
  const blockedMarkets = operational.blocked_markets || [];

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
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* Operational Vigilance Banner if Kill-Switch active or Blocked Markets */}
      {(isKillSwitchActive || blockedMarkets.length > 0) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Vigilance opérationnelle active
              </span>
              <span className="text-[9px] text-slate-600 dark:text-slate-400">
                {isKillSwitchActive && 'Kill-Switch actif (probabilités 1X2 & Buts neutralisées). '}
                {blockedMarkets.length > 0 && `Marchés bloqués : ${blockedMarkets.join(', ')}.`}
              </span>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('risk')}
              className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 transition-colors flex items-center gap-1 shrink-0"
            >
              Détails du risque <ArrowRight size={10} />
            </button>
          )}
        </div>
      )}

      {/* Top Grid: Statistical Market Overview (Full Width / Prominent) */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Crosshair size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Statistical Market Overview
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Projections statistiques directes (Corners, Tirs, Cadrés, Touches) et références de ligue.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Priorité décisionnelle
          </span>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statisticalMarkets.map(({ key, label, refKey, refType, propKey, lambdaKey }) => {
            const refVal = anchors[refKey];
            const prob = props[propKey];
            const lambdaVal = props[lambdaKey];
            const isGenerated = lambdaVal !== undefined && lambdaVal !== null;

            return (
              <div
                key={key}
                className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/60">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {label}
                  </span>
                  <Badge variant="default" className="text-[8px] px-1.5 py-0 font-mono">
                    {refType}
                  </Badge>
                </div>

                {isGenerated ? (
                  <div className="my-3 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest">Total Attendu (λ)</span>
                      <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {lambdaVal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[9px] text-slate-500 uppercase">{refType}:</span>
                      <span className="text-slate-600 dark:text-slate-400 font-bold">
                        {refVal !== undefined ? refVal.toFixed(2) : '-'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/40 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Prob &gt; Réf ligue</span>
                      <span className={`font-mono text-sm font-bold ${getPropTextColor(prob || 0)}`}>
                        {prob !== undefined ? `${(prob * 100).toFixed(1)}%` : '-'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="my-6 py-4 px-2 text-center bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <p className="text-[10px] text-slate-400 italic">
                      Projection non générée dans cette session
                    </p>
                  </div>
                )}

                <div className="text-[8px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-900">
                  {key === 'throws' ? 'Moyenne arithmétique de ligue' : 'Médiane empirique de ligue'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle Grid: Core Market Snapshot & Proposition Bets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Context Snapshot (Core Market) */}
        <div className="lg:col-span-1">
          <Card title="Core Market Snapshot" titleIcon={<BarChart3 size={16} />}>
            <div className="space-y-4 mt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Rappel synthétique du contexte classique 1X2 & Buts modélisé.
              </p>

              {/* 1X2 Mini Bar */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>1X2 Probabilités</span>
                  {isKillSwitchActive && <span className="text-rose-500 font-mono text-[8px]">KILL-SWITCH</span>}
                </div>
                {isKillSwitchActive ? (
                  <div className="p-2 text-center text-rose-500 text-[10px] font-mono bg-rose-500/5 rounded border border-rose-500/20">
                    Probabilités neutralisées par le Kill-Switch
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                      <div className="text-[8px] text-blue-600 dark:text-blue-400 font-bold uppercase">Home</div>
                      <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{((probs.PROB_1 || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-[8px] text-slate-500 font-bold uppercase">Draw</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{((probs.PROB_X || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      <div className="text-[8px] text-rose-600 dark:text-rose-400 font-bold uppercase">Away</div>
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-300">{((probs.PROB_2 || 0) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Goals Snapshot */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Buts & Intensité Modélisée
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] text-slate-500">Over 2.5:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{((probs.PROB_O25 || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] text-slate-500">BTTS:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{((probs.PROB_BTTS || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] text-slate-500">λ Home:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{diag.lambda_home?.toFixed(2) || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] text-slate-500">λ Away:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{diag.lambda_away?.toFixed(2) || '-'}</span>
                  </div>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('core')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Explorer le Core Market complet <ArrowRight size={12} />
                </button>
              )}
            </div>
          </Card>
        </div>

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
                      <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-none">FALSE FAVORITE ALERT</span>
                      <span className="text-[8px] text-rose-500/80">Favori algorithmique vulnérable</span>
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
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Match Openness Index</span>
                  <span className="text-[8px] text-slate-400">Degré d'ouverture offensive du match</span>
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
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] text-slate-400 uppercase tracking-widest">
                  <th className="py-2 px-3">Métrique</th>
                  <th className="py-2 px-3">Nature du repère</th>
                  <th className="py-2 px-3 text-right">Valeur Ligue</th>
                  <th className="py-2 px-3 text-right">Lambda Match</th>
                  <th className="py-2 px-3 text-right">Prob &gt; Réf Ligue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {statisticalMarkets.map(({ key, label, refKey, refType, propKey, lambdaKey }) => {
                  const refVal = anchors[refKey];
                  const prob = props[propKey];
                  const lambdaVal = props[lambdaKey];
                  const isGen = lambdaVal !== undefined && lambdaVal !== null;

                  return (
                    <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">
                        {label}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px]">
                        {refType}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {refVal !== undefined ? refVal.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {isGen ? lambdaVal.toFixed(2) : <span className="text-slate-400 italic text-[10px]">Non générée</span>}
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
          <p className="text-[9px] text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800">
            * Indicateurs statistiques de référence algorithmique (moyennes et médianes de ligue). Ne constituent pas des lignes ou cotes bookmaker.
          </p>
        </div>
      </Card>

    </div>
  );
}
