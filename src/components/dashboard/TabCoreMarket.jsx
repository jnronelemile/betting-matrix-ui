import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import {
  Activity,
  Percent,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Grid,
  Crosshair,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function TabCoreMarket({ match, onNavigateTab }) {
  const [gridScope, setGridScope] = useState('5x5'); // '5x5' or '10x10'

  const probs = match.True_Probabilities || {};
  const odds = match.True_Odds || {};
  const risk = match.Risk_Management_Context || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const props = match.Prop_Bets || {};
  const scores = match.Top_3_Exact_Scores || {};
  const teamGoals = match.Team_Goals_Markets || {};
  const fullGrid = match.Full_Exact_Score_Grid || {};
  const blockedMarkets = risk.Operational_Restrictions?.blocked_markets || [];
  const preKillProbs = match.Pre_Kill_Probabilities || null;
  const preKillTeamGoals = match.Pre_Kill_Team_Goals || null;
  const superSignals = match.Super_Signals || {};
  const investSignals = risk.Investment_Signals || {};

  const isKillSwitchActive = investSignals.IS_KILL_SWITCH_ACTIVE ||
    ((probs.PROB_1 === 0 || probs.PROB_1 == null) && (probs.PROB_O25 === 0 || probs.PROB_O25 == null));

  const is1X2Zero = probs.PROB_1 === 0 || probs.PROB_1 == null;
  const isGoalsZero = probs.PROB_O25 === 0 || probs.PROB_O25 == null;

  const isMarketBlocked = (code) => blockedMarkets.includes(code);

  const renderMarketLabel = (text, blockedCode) => {
    const blocked = blockedCode && isMarketBlocked(blockedCode);
    return (
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="truncate">{text}</span>
        {blocked && (
          <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
            BLOCKED
          </span>
        )}
      </span>
    );
  };

  const renderProbOdds = (prob, oddsValue) => (
    <span className="flex items-center justify-end gap-6 sm:gap-8 min-w-[140px]">
      <span className="text-slate-800 dark:text-slate-200 text-right w-12 font-mono">{(prob * 100).toFixed(1)}%</span>
      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-right w-16 font-mono">@{oddsValue?.toFixed(2) || '-'}</span>
    </span>
  );

  const maxRowCol = gridScope === '5x5' ? 5 : 10;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* Operational Alert Banner if Kill-Switch Active */}
      {isKillSwitchActive && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Kill-Switch Sécurité Actif
              </span>
              <span className="text-[9px] text-slate-600 dark:text-slate-400">
                Les probabilités effectives 1X2 et Buts ont été ramenées à zéro. Les valeurs affichées en encadré constituent des diagnostics pré-neutralisation exclusivement.
              </span>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('risk')}
              className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 transition-colors flex items-center gap-1 shrink-0"
            >
              Voir la gestion de risque <ArrowRight size={10} />
            </button>
          )}
        </div>
      )}

      {/* Primary Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: 1X2 Winner & Super Signals */}
        <div className="flex flex-col gap-6">

          {/* Match Winner (1X2) */}
          <Card title="Match Winner (1X2)" titleIcon={<Percent size={16} />}>
            <div className="space-y-5 mt-1">
              {is1X2Zero ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center gap-2">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400 w-6 h-6 mb-1" />
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Marché 1X2 Neutralisé</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Probabilités effectives à 0 % (Kill-Switch Actif)</span>
                  </div>

                  {preKillProbs && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-rose-500/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Probabilités pré-neutralisation (Diagnostic)
                        </span>
                        <span className="text-[8px] text-slate-400 italic">Non exploitable</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Home (1):</span>
                          <span className="font-bold">{((preKillProbs.PROB_1 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Draw (X):</span>
                          <span className="font-bold">{((preKillProbs.PROB_X || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Away (2):</span>
                          <span className="font-bold">{((preKillProbs.PROB_2 || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ProgressBar
                    label={renderMarketLabel("Home (1)", "1X2_HOME")}
                    value={probs.PROB_1 || 0}
                    colorClass="bg-blue-500"
                    displayValue={renderProbOdds(probs.PROB_1 || 0, odds.ODDS_1)}
                  />
                  <ProgressBar
                    label={renderMarketLabel("Draw (X)", null)}
                    value={probs.PROB_X || 0}
                    colorClass="bg-slate-500"
                    displayValue={renderProbOdds(probs.PROB_X || 0, odds.ODDS_X)}
                  />
                  <ProgressBar
                    label={renderMarketLabel("Away (2)", "1X2_AWAY")}
                    value={probs.PROB_2 || 0}
                    colorClass="bg-rose-500"
                    displayValue={renderProbOdds(probs.PROB_2 || 0, odds.ODDS_2)}
                  />
                </>
              )}
            </div>
          </Card>

          {/* Native Super Signals (Strictly Engine Booleans) */}
          <Card title="Super Signals (Moteur TITANIUM)" titleIcon={<Zap size={16} />}>
            <div className="flex flex-col gap-3 mt-1">
              <p className="text-[9px] text-slate-400 italic">
                Signaux booléens natifs déclenchés par le moteur de règles. Distincts des probabilités brutes.
              </p>

              {superSignals.O_CORNERS_ELITE && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                  <AlertCircle className="text-emerald-600 dark:text-emerald-400 shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">Corners : Elite</span>
                    <span className="text-[8px] text-slate-500">Volumétrie exceptionnelle de corners anticipée</span>
                  </div>
                </div>
              )}
              {superSignals.O_SHOTS_ELITE && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                  <Crosshair className="text-blue-600 dark:text-blue-400 shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">Shots : Elite</span>
                    <span className="text-[8px] text-slate-500">Volumétrie exceptionnelle de tirs anticipée</span>
                  </div>
                </div>
              )}
              {superSignals.O15_ELITE && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                  <AlertCircle className="text-emerald-600 dark:text-emerald-400 shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">O1.5 : Elite</span>
                    <span className="text-[8px] text-slate-500">Signal volumétrique buts haut niveau</span>
                  </div>
                </div>
              )}
              {superSignals.U25_STERILE_DOMINATION && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                  <ShieldCheck className="text-amber-600 dark:text-amber-400 shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-widest uppercase">Sterile Domination (U2.5)</span>
                    <span className="text-[8px] text-slate-500">Possession stérile anticipée</span>
                  </div>
                </div>
              )}
              {superSignals.FAV_O25_STORM && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                  <TrendingUp className="text-blue-600 dark:text-blue-400 shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">Favorite Goals Storm</span>
                    <span className="text-[8px] text-slate-500">Dynamique offensive asymétrique</span>
                  </div>
                </div>
              )}
              {superSignals.H_MINUS_25_ANNIHILATION && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                  <Activity className="text-rose-600 dark:text-rose-400 shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tracking-widest uppercase">Annihilation H-2.5</span>
                    <span className="text-[8px] text-slate-500">Écart de niveau structural maximal</span>
                  </div>
                </div>
              )}

              {Object.values(superSignals).every(v => v === false) && (
                <div className="text-center py-6 px-4 text-slate-400 dark:text-slate-500/70 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Aucun Super Signal Actif
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* Column 2: Goals & Props Snapshot */}
        <div className="flex flex-col gap-6">

          {/* Goals Markets & BTTS */}
          <Card title="Goals Markets & BTTS" titleIcon={<ShieldCheck size={16} />}>
            <div className="space-y-5 mt-1">
              {isGoalsZero ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center gap-2">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400 w-6 h-6 mb-1" />
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Marchés de Buts Neutralisés</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Probabilités effectives à 0 % (Kill-Switch Actif)</span>
                  </div>

                  {preKillProbs && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-rose-500/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Probabilités pré-neutralisation (Diagnostic)
                        </span>
                        <span className="text-[8px] text-slate-400 italic">Non exploitable</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Over 1.5:</span>
                          <span className="font-bold">{((preKillProbs.PROB_O15 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Over 2.5:</span>
                          <span className="font-bold">{((preKillProbs.PROB_O25 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Under 2.5:</span>
                          <span className="font-bold">{((preKillProbs.PROB_U25 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>Under 3.5:</span>
                          <span className="font-bold">{((preKillProbs.PROB_U35 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span>BTTS (Yes):</span>
                          <span className="font-bold">{((preKillProbs.PROB_BTTS || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ProgressBar
                    label={renderMarketLabel("Over 1.5", null)}
                    value={probs.PROB_O15 || 0}
                    colorClass={probs.PROB_O15 >= 0.75 ? "bg-emerald-500" : "bg-emerald-500/50"}
                    displayValue={renderProbOdds(probs.PROB_O15 || 0, odds.ODDS_O15)}
                  />
                  <ProgressBar
                    label={renderMarketLabel("Over 2.5", "OVER_2.5")}
                    value={probs.PROB_O25 || 0}
                    colorClass={probs.PROB_O25 >= 0.55 ? "bg-emerald-500" : "bg-emerald-500/50"}
                    displayValue={renderProbOdds(probs.PROB_O25 || 0, odds.ODDS_O25)}
                  />
                  <ProgressBar
                    label={renderMarketLabel("Under 2.5", "UNDER_2.5")}
                    value={probs.PROB_U25 || 0}
                    colorClass={probs.PROB_U25 >= 0.55 ? "bg-amber-500" : "bg-amber-500/50"}
                    displayValue={renderProbOdds(probs.PROB_U25 || 0, odds.ODDS_U25)}
                  />
                  <ProgressBar
                    label={renderMarketLabel("Under 3.5", "UNDER_3.5")}
                    value={probs.PROB_U35 || 0}
                    colorClass={probs.PROB_U35 >= 0.75 ? "bg-amber-500" : "bg-amber-500/50"}
                    displayValue={renderProbOdds(probs.PROB_U35 || 0, odds.ODDS_U35)}
                  />
                  <ProgressBar
                    label={renderMarketLabel("BTTS (Yes)", "BTTS")}
                    value={probs.PROB_BTTS || 0}
                    colorClass={probs.PROB_BTTS >= 0.60 ? "bg-indigo-500" : "bg-indigo-500/50"}
                    displayValue={renderProbOdds(probs.PROB_BTTS || 0, odds.ODDS_BTTS)}
                  />
                </>
              )}
            </div>
          </Card>

          {/* Statistical Props Snapshot (Contextual Recall - 4 Disciplines) */}
          <Card title="Props & Marchés Statistiques (Aperçu)" titleIcon={<Crosshair size={16} />}>
            <div className="space-y-4 mt-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Synthèse des volumes attendus modélisés sur les 4 disciplines secondaires.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Corners */}
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
                    <span>Corners λ</span>
                  </div>
                  {Number.isFinite(props.LAMBDA_CORNERS_MATCH) ? (
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200">
                        {props.LAMBDA_CORNERS_MATCH.toFixed(2)}
                      </span>
                      {Number.isFinite(props.PROB_OVER_MEDIAN_CORNERS) && (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(props.PROB_OVER_MEDIAN_CORNERS * 100).toFixed(0)}% &gt; Réf
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-400 italic">Non généré</span>
                  )}
                </div>

                {/* SOT */}
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
                    <span>Tirs Cadrés λ</span>
                  </div>
                  {Number.isFinite(props.LAMBDA_SOT_MATCH) ? (
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200">
                        {props.LAMBDA_SOT_MATCH.toFixed(2)}
                      </span>
                      {Number.isFinite(props.PROB_OVER_MEDIAN_SOT) && (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(props.PROB_OVER_MEDIAN_SOT * 100).toFixed(0)}% &gt; Réf
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-400 italic">Non généré</span>
                  )}
                </div>

                {/* Shots */}
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
                    <span>Tirs Totaux λ</span>
                  </div>
                  {Number.isFinite(props.LAMBDA_SHOTS_MATCH) ? (
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200">
                        {props.LAMBDA_SHOTS_MATCH.toFixed(2)}
                      </span>
                      {Number.isFinite(props.PROB_OVER_MEDIAN_SHOTS) && (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(props.PROB_OVER_MEDIAN_SHOTS * 100).toFixed(0)}% &gt; Réf
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-400 italic">Non généré</span>
                  )}
                </div>

                {/* Throws */}
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-slate-500 mb-1 font-bold">
                    <span>Touches λ</span>
                  </div>
                  {Number.isFinite(props.LAMBDA_THROWS_MATCH) ? (
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200">
                        {props.LAMBDA_THROWS_MATCH.toFixed(2)}
                      </span>
                      {Number.isFinite(props.PROB_OVER_MEDIAN_THROWS) && (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(props.PROB_OVER_MEDIAN_THROWS * 100).toFixed(0)}% &gt; Seuil
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-400 italic">Non généré</span>
                  )}
                </div>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('tactical')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Explorer les Marchés Statistiques détaillés <ArrowRight size={12} />
                </button>
              )}
            </div>
          </Card>

        </div>

        {/* Column 3: Team Goals, Handicaps & Exact Score Grid */}
        <div className="flex flex-col gap-6">

          {/* Team Goals Projection */}
          <Card title="Entity Analysis (Goals)" titleIcon={<Activity size={16} />}>
            <div className="space-y-4 mt-1">
              {isGoalsZero ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center gap-2">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400 w-6 h-6 mb-1" />
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Marchés Buts Équipes Neutralisés</span>
                  </div>

                  {preKillTeamGoals && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-rose-500/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Buts Équipes pré-neutralisation (Diagnostic)
                        </span>
                        <span className="text-[8px] text-slate-400 italic">Non exploitable</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>FAV Over 1.5:</span>
                          <span className="font-bold">{((preKillTeamGoals.PROB_FAV_O15 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>FAV Over 2.5:</span>
                          <span className="font-bold">{((preKillTeamGoals.PROB_FAV_O25 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>OUT Over 0.5:</span>
                          <span className="font-bold">{((preKillTeamGoals.PROB_OUT_O05 || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>OUT Over 1.5:</span>
                          <span className="font-bold">{((preKillTeamGoals.PROB_OUT_O15 || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-widest">Projection Buts Équipes</span>
                    <Badge variant="default" className="text-[8px] px-1.5 py-0 font-mono">Gap: {((teamGoals.Target_Entity?.Probability_Gap || 0) * 100).toFixed(1)}%</Badge>
                  </div>

                  {/* Favorite Goals */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-200 dark:border-slate-800/50 pb-1.5">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">FAV: {teamGoals.Target_Entity?.Favorite}</span>
                    </div>
                    <div className="flex flex-col gap-2 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-sans">Over 1.5</span>
                        <div className="flex gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{((teamGoals.Favorite_Goals?.PROB_FAV_O15 || 0) * 100).toFixed(1)}%</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">@{teamGoals.Favorite_Goals?.ODDS_FAV_O15?.toFixed(2) || '-'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-sans">Over 2.5</span>
                        <div className="flex gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{((teamGoals.Favorite_Goals?.PROB_FAV_O25 || 0) * 100).toFixed(1)}%</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">@{teamGoals.Favorite_Goals?.ODDS_FAV_O25?.toFixed(2) || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outsider Goals */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-200 dark:border-slate-800/50 pb-1.5">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">OUT: {teamGoals.Target_Entity?.Outsider}</span>
                    </div>
                    <div className="flex flex-col gap-2 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-sans">Over 0.5</span>
                        <div className="flex gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{((teamGoals.Outsider_Goals?.PROB_OUT_O05 || 0) * 100).toFixed(1)}%</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">@{teamGoals.Outsider_Goals?.ODDS_OUT_O05?.toFixed(2) || '-'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-sans">Over 1.5</span>
                        <div className="flex gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{((teamGoals.Outsider_Goals?.PROB_OUT_O15 || 0) * 100).toFixed(1)}%</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">@{teamGoals.Outsider_Goals?.ODDS_OUT_O15?.toFixed(2) || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Standard Handicaps */}
          {match.Standard_Handicaps && (
            <Card title="Standard Handicaps" titleIcon={<TrendingUp size={16} />}>
              <div className="space-y-3 mt-1">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Badge variant="info" className="text-[10px] px-2 py-0.5">Favorite : {match.Standard_Handicaps.favorite}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.entries(match.Standard_Handicaps).filter(([k]) => k.startsWith('H_')).map(([k, v]) => (
                    <div key={k} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl flex justify-between items-center shadow-sm font-mono">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans font-bold">{k.replace('_', ' ')}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{(v.prob * 100).toFixed(1)}%</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">@{v.odds?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Top 3 Correct Scores */}
          {Object.keys(scores).length > 0 && (
            <Card title="Top 3 Correct Scores" titleIcon={<TrendingUp size={16} />}>
              <div className="flex flex-col gap-2.5 mt-1">
                {Object.values(scores).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-slate-800 dark:text-slate-200 font-serif tracking-wider">{item.score}</span>
                      <Badge variant="default" className="text-[10px] px-2 py-0.5 font-mono">{(item.prob * 100).toFixed(1)}%</Badge>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">@{item.odds?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>

      </div>

      {/* Full Exact Score Grid (Full Width at bottom) */}
      {Object.keys(fullGrid).length > 0 && (
        <Card title="Full Exact Score Grid (Densité Bivariée)" titleIcon={<Grid size={16} />}>
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                {gridScope === '5x5' ? 'Vue condensée 5x5 (0-4)' : 'Matrice 10x10 complète (0-9)'}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[8px] font-black uppercase">
                <button
                  onClick={() => setGridScope('5x5')}
                  className={`px-2 py-0.5 rounded ${gridScope === '5x5' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
                >
                  5x5
                </button>
                <button
                  onClick={() => setGridScope('10x10')}
                  className={`px-2 py-0.5 rounded ${gridScope === '10x10' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                >
                  10x10 (100)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 p-2 custom-scrollbar">
              <table className="w-full text-center border-collapse text-[9px] font-mono">
                <thead>
                  <tr>
                    <th className="p-1 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-[7px] text-slate-400 uppercase">
                      H \ A
                    </th>
                    {Array.from({ length: maxRowCol }).map((_, a) => (
                      <th key={a} className="p-1 border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxRowCol }).map((_, h) => (
                    <tr key={h}>
                      <td className="p-1 border border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50">
                        {h}
                      </td>
                      {Array.from({ length: maxRowCol }).map((_, a) => {
                        const scoreKey = `${h}-${a}`;
                        const rawProb = fullGrid[scoreKey];
                        const pct = rawProb !== undefined ? rawProb * 100 : null;
                        const isTop = pct !== null && pct >= 5.0;
                        return (
                          <td
                            key={scoreKey}
                            title={`${scoreKey}: ${pct !== null ? pct.toFixed(3) : 0}%`}
                            className={`p-1 border border-slate-200 dark:border-slate-800/60 ${isTop ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                          >
                            {pct !== null ? (pct >= 0.05 ? `${pct.toFixed(1)}%` : '<0.1%') : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="text-[8px] text-slate-400 dark:text-slate-500 italic text-center">
              Densité bivariée exacte TITANIUM ({Object.keys(fullGrid).length} cellules restituées sans renormalisation).
            </span>
          </div>
        </Card>
      )}

    </div>
  );
}
