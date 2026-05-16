import React from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { Activity, Percent, AlertCircle, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';

export default function TabCoreMarket({ match }) {
  const probs = match.True_Probabilities || {};
  const odds = match.True_Odds || {};
  const risk = match.Risk_Management_Context || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const props = match.Prop_Bets || {};
  const scores = match.Top_3_Exact_Scores || {};
  const teamGoals = match.Team_Goals_Markets || {};

  const is1X2Zero = probs.PROB_1 === 0 || probs.PROB_1 == null;
  const isGoalsZero = probs.PROB_O25 === 0 || probs.PROB_O25 == null;

  const renderProbOdds = (prob, oddsValue) => (
    <span className="flex items-center justify-end gap-6 sm:gap-8 min-w-[140px]">
      <span className="text-slate-200 text-right w-12">{(prob * 100).toFixed(1)}%</span>
      <span className="text-emerald-400 font-bold text-right w-16">@{oddsValue?.toFixed(2) || '-'}</span>
    </span>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Colonne 1: Buts des Équipes (Priorité 1) */}
      <div className="flex flex-col gap-6">
        <Card title="Analyse par Entité (Buts)" titleIcon={<Activity size={16} />}>
          <div className="space-y-6 mt-2">
            {isGoalsZero ? (
              <div className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center gap-2">
                <AlertTriangle className="text-rose-400 w-6 h-6 mb-1" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Données Invalidées</span>
                <span className="text-[10px] text-slate-500">Marchés des Buts à zéro</span>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Projection v8.5</span>
                  <Badge variant="default" className="text-[8px] px-1.5 py-0">Gap: {(teamGoals.Target_Entity?.Probability_Gap * 100).toFixed(1)}%</Badge>
                </div>
                
                {/* Favorite Goals */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/30"></div>
                  <div className="flex justify-between items-center mb-3 border-b border-slate-800/50 pb-2">
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">FAV: {teamGoals.Target_Entity?.Favorite}</span>
                    {teamGoals.Favorite_Goals?.Alpha_Signals_Active?.length > 0 && (
                      <div className="flex gap-1">
                        {teamGoals.Favorite_Goals.Alpha_Signals_Active.map(s => (
                          <div key={s} className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_5px_rgba(14,165,233,0.5)]" title={s}></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Over 1.5</span>
                      <div className="flex gap-3">
                        <span className="text-xs font-bold text-slate-200">{(teamGoals.Favorite_Goals?.PROB_FAV_O15 * 100).toFixed(1)}%</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">@{teamGoals.Favorite_Goals?.ODDS_FAV_O15?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Over 2.5</span>
                      <div className="flex gap-3">
                        <span className="text-xs font-bold text-slate-200">{(teamGoals.Favorite_Goals?.PROB_FAV_O25 * 100).toFixed(1)}%</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">@{teamGoals.Favorite_Goals?.ODDS_FAV_O25?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Outsider Goals */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30"></div>
                  <div className="flex justify-between items-center mb-3 border-b border-slate-800/50 pb-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">OUT: {teamGoals.Target_Entity?.Outsider}</span>
                    {teamGoals.Outsider_Goals?.Alpha_Signals_Active?.length > 0 && (
                      <div className="flex gap-1">
                        {teamGoals.Outsider_Goals.Alpha_Signals_Active.map(s => (
                          <div key={s} className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.5)]" title={s}></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Over 0.5</span>
                      <div className="flex gap-3">
                        <span className="text-xs font-bold text-slate-200">{(teamGoals.Outsider_Goals?.PROB_OUT_O05 * 100).toFixed(1)}%</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">@{teamGoals.Outsider_Goals?.ODDS_OUT_O05?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Over 1.5</span>
                      <div className="flex gap-3">
                        <span className="text-xs font-bold text-slate-200">{(teamGoals.Outsider_Goals?.PROB_OUT_O15 * 100).toFixed(1)}%</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">@{teamGoals.Outsider_Goals?.ODDS_OUT_O15?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alpha Signals Text */}
                {(teamGoals.Favorite_Goals?.Alpha_Signals_Active?.length > 0 || teamGoals.Outsider_Goals?.Alpha_Signals_Active?.length > 0) && (
                  <div className="pt-2 border-t border-slate-800/50">
                    <div className="flex flex-wrap gap-1.5">
                      {teamGoals.Favorite_Goals?.Alpha_Signals_Active?.map(s => (
                        <Badge key={s} variant="info" className="text-[8px] py-0 tracking-tighter uppercase">FAV: {s}</Badge>
                      ))}
                      {teamGoals.Outsider_Goals?.Alpha_Signals_Active?.map(s => (
                        <Badge key={s} variant="warning" className="text-[8px] py-0 tracking-tighter uppercase">OUT: {s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title="Signaux Forts (>70%)" titleIcon={<TrendingUp size={16} />}>
          <div className="flex flex-col gap-4 mt-2">
            {match.Super_Signals?.O15_ELITE && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                <AlertCircle className="text-emerald-400 shrink-0" size={16} />
                <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">O1.5 : Élite</span>
              </div>
            )}
            {match.Super_Signals?.U25_STERILE_DOMINATION && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                <ShieldCheck className="text-amber-400 shrink-0" size={16} />
                <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">Domination Stérile (U2.5)</span>
              </div>
            )}
            {match.Super_Signals?.FAV_O25_STORM && (
              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                <TrendingUp className="text-blue-400 shrink-0" size={16} />
                <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">Tempête de Buts Favori</span>
              </div>
            )}
            {match.Super_Signals?.H_MINUS_25_ANNIHILATION && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                <Activity className="text-rose-400 shrink-0" size={16} />
                <span className="text-[10px] font-bold text-rose-400 tracking-widest uppercase">Annihilation H-2.5</span>
              </div>
            )}
            {match.Super_Signals?.O_FOULS_ELITE && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex gap-3 items-center shadow-sm">
                <AlertCircle className="text-emerald-400 shrink-0" size={16} />
                <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Fautes : Élite</span>
              </div>
            )}

            {Object.values(match.Super_Signals || {}).every(v => v === false) && (
              <div className="text-center py-6 px-4 text-slate-500/70 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">
                Aucun Super Signal Actif
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Colonne 2: Marchés des Buts & BTTS (Priorité 2) */}
      <div className="flex flex-col gap-6">
        <Card title="Marchés des Buts & BTTS" titleIcon={<ShieldCheck size={16} />}>
          <div className="space-y-6 mt-2">
            {isGoalsZero ? (
              <div className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center gap-2">
                <AlertTriangle className="text-rose-400 w-6 h-6 mb-1" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Données Invalidées</span>
                <span className="text-[10px] text-slate-500">Marchés des Buts à zéro</span>
              </div>
            ) : (
              <>
                <ProgressBar label="Over 1.5" value={probs.PROB_O15 || 0} colorClass={probs.PROB_O15 >= 0.75 ? "bg-emerald-500" : "bg-emerald-500/50"} displayValue={renderProbOdds(probs.PROB_O15 || 0, odds.ODDS_O15)} />
                <ProgressBar label="Over 2.5" value={probs.PROB_O25 || 0} colorClass={probs.PROB_O25 >= 0.55 ? "bg-emerald-500" : "bg-emerald-500/50"} displayValue={renderProbOdds(probs.PROB_O25 || 0, odds.ODDS_O25)} />
                <ProgressBar label="Under 2.5" value={probs.PROB_U25 || 0} colorClass={probs.PROB_U25 >= 0.55 ? "bg-amber-500" : "bg-amber-500/50"} displayValue={renderProbOdds(probs.PROB_U25 || 0, odds.ODDS_U25)} />
                <ProgressBar label="Under 3.5" value={probs.PROB_U35 || 0} colorClass={probs.PROB_U35 >= 0.75 ? "bg-amber-500" : "bg-amber-500/50"} displayValue={renderProbOdds(probs.PROB_U35 || 0, odds.ODDS_U35)} />
                <ProgressBar label="BTTS (Oui)" value={probs.PROB_BTTS || 0} colorClass={probs.PROB_BTTS >= 0.60 ? "bg-indigo-500" : "bg-indigo-500/50"} displayValue={renderProbOdds(probs.PROB_BTTS || 0, odds.ODDS_BTTS)} />
              </>
            )}
          </div>
        </Card>

        {/* Top 3 Scores */}
        {Object.keys(scores).length > 0 && (
          <Card title="Top 3 Scores Exacts" titleIcon={<TrendingUp size={16} />}>
            <div className="flex flex-col gap-3 mt-1">
              {Object.values(scores).map((item, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 justify-between items-center bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-inner">
                  <div className="flex items-center gap-4">
                    <span className="text-base font-bold text-slate-200 font-serif tracking-wider">{item.score}</span>
                    <Badge variant="default" className="text-[10px] px-2 py-0.5">{(item.prob * 100).toFixed(1)}%</Badge>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400">@{item.odds?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Colonne 3: Vainqueur du Match (Priorité 3) */}
      <div className="flex flex-col gap-6">
        <Card title="Vainqueur du Match (1X2)" titleIcon={<Percent size={16} />}>
          <div className="space-y-6 mt-2">
            {is1X2Zero ? (
              <div className="flex flex-col items-center justify-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center gap-2">
                <AlertTriangle className="text-rose-400 w-6 h-6 mb-1" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Données Invalidées</span>
                <span className="text-[10px] text-slate-500">Marché 1X2 à zéro (Kill-Switch)</span>
              </div>
            ) : (
              <>
                <ProgressBar label="Domicile (1)" value={probs.PROB_1 || 0} colorClass="bg-blue-500" displayValue={renderProbOdds(probs.PROB_1 || 0, odds.ODDS_1)} />
                <ProgressBar label="Nul (X)" value={probs.PROB_X || 0} colorClass="bg-slate-500" displayValue={renderProbOdds(probs.PROB_X || 0, odds.ODDS_X)} />
                <ProgressBar label="Extérieur (2)" value={probs.PROB_2 || 0} colorClass="bg-rose-500" displayValue={renderProbOdds(probs.PROB_2 || 0, odds.ODDS_2)} />
              </>
            )}
          </div>
        </Card>

        {/* Asian/Standard Handicaps inside Column 3 */}
        {match.Standard_Handicaps && (
          <Card title="Handicaps Standard" titleIcon={<TrendingUp size={16} />}>
            <div className="space-y-4 mt-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <Badge variant="info" className="text-[10px] px-2 py-0.5">Favori : {match.Standard_Handicaps.favorite}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(match.Standard_Handicaps).filter(([k]) => k.startsWith('H_')).map(([k, v]) => (
                  <div key={k} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-inner">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{k.replace('_', ' ')}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-300">{(v.prob * 100).toFixed(1)}%</span>
                      <span className="font-mono text-xs text-emerald-400 font-bold">@{v.odds?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
