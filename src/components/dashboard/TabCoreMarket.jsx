import React from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { Activity, Percent, AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react';

export default function TabCoreMarket({ match }) {
  const probs = match.True_Probabilities || {};
  const odds = match.True_Odds || {};
  const risk = match.Risk_Management_Context || {};
  const narrative = risk.Situational_Narrative || {};
  const psychology = risk.Team_Psychology || {};
  const tactical = risk.Tactical_Red_Flags || {};
  const props = match.Prop_Bets || {};
  const scores = match.Top_3_Exact_Scores || {};

  const getMomentumVariant = (momentum) => {
    if (momentum === 'HOT' || momentum === 'FIRE') return 'success';
    if (momentum === 'COLD' || momentum === 'ICE') return 'danger';
    return 'default';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Widget A: Probabilities & Odds */}
      <div className="flex flex-col gap-6">
        <Card title="Vainqueur du Match (1X2)" titleIcon={<Percent size={16} />}>
          <div className="space-y-6 mt-2">
            <ProgressBar label="Domicile (1)" value={probs.PROB_1 || 0} colorClass="bg-blue-500" displayValue={`${(probs.PROB_1 * 100).toFixed(1)}% \u00A0\u00A0 (@${odds.ODDS_1?.toFixed(2) || '-'})`} />
            <ProgressBar label="Nul (X)" value={probs.PROB_X || 0} colorClass="bg-slate-500" displayValue={`${(probs.PROB_X * 100).toFixed(1)}% \u00A0\u00A0 (@${odds.ODDS_X?.toFixed(2) || '-'})`} />
            <ProgressBar label="Extérieur (2)" value={probs.PROB_2 || 0} colorClass="bg-rose-500" displayValue={`${(probs.PROB_2 * 100).toFixed(1)}% \u00A0\u00A0 (@${odds.ODDS_2?.toFixed(2) || '-'})`} />
          </div>
        </Card>

        <Card title="Signaux Forts (>70%)" titleIcon={<TrendingUp size={16} />}>
          <div className="flex flex-col gap-6 mt-2">
            {match.Super_Signals?.O15_ELITE && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex gap-3 items-center shadow-sm">
                <AlertCircle className="text-emerald-400 shrink-0" size={18} />
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Super Signal O1.5 : Élite</span>
              </div>
            )}
            {match.Super_Signals?.O_CORNERS_ELITE && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex gap-3 items-center shadow-sm">
                <AlertCircle className="text-emerald-400 shrink-0" size={18} />
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Super Signal Corners : Élite</span>
              </div>
            )}
            {match.Super_Signals?.O_SHOTS_ELITE && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex gap-3 items-center shadow-sm">
                <AlertCircle className="text-emerald-400 shrink-0" size={18} />
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Super Signal Tirs : Élite</span>
              </div>
            )}
            {match.Super_Signals?.O_SOT_ELITE && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex gap-3 items-center shadow-sm">
                <AlertCircle className="text-emerald-400 shrink-0" size={18} />
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Super Signal Cadrés : Élite</span>
              </div>
            )}

            {(!match.Super_Signals?.O15_ELITE && !match.Super_Signals?.O_CORNERS_ELITE && !match.Super_Signals?.O_SHOTS_ELITE && !match.Super_Signals?.O_SOT_ELITE) && (
              <div className="text-center py-8 px-4 text-slate-500/70 text-xs font-bold uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">
                Aucun Super Signal Élite Actif
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Colonne 2: Marchés des Buts */}
      <div className="flex flex-col gap-6">
        <Card title="Marchés des Buts & BTTS" titleIcon={<ShieldCheck size={16} />}>
          <div className="space-y-6 mt-2">
            <ProgressBar label="Plus de 1.5 (Over)" value={probs.PROB_O15 || 0} colorClass={probs.PROB_O15 >= 0.75 ? "bg-emerald-500" : "bg-emerald-500/50"} displayValue={(probs.PROB_O15 * 100).toFixed(1) + '% \u00A0\u00A0 (@' + (odds.ODDS_O15?.toFixed(2) || '-') + ')'} />
            <ProgressBar label="Plus de 2.5 (Over)" value={probs.PROB_O25 || 0} colorClass={probs.PROB_O25 >= 0.55 ? "bg-emerald-500" : "bg-emerald-500/50"} displayValue={(probs.PROB_O25 * 100).toFixed(1) + '% \u00A0\u00A0 (@' + (odds.ODDS_O25?.toFixed(2) || '-') + ')'} />
            <ProgressBar label="Moins de 2.5 (Under)" value={probs.PROB_U25 || 0} colorClass={probs.PROB_U25 >= 0.55 ? "bg-amber-500" : "bg-amber-500/50"} displayValue={(probs.PROB_U25 * 100).toFixed(1) + '% \u00A0\u00A0 (@' + (odds.ODDS_U25?.toFixed(2) || '-') + ')'} />
            <ProgressBar label="Moins de 3.5 (Under)" value={probs.PROB_U35 || 0} colorClass={probs.PROB_U35 >= 0.75 ? "bg-amber-500" : "bg-amber-500/50"} displayValue={(probs.PROB_U35 * 100).toFixed(1) + '% \u00A0\u00A0 (@' + (odds.ODDS_U35?.toFixed(2) || '-') + ')'} />
            <ProgressBar label="Les Deux Marquent (Oui)" value={probs.PROB_BTTS || 0} colorClass={probs.PROB_BTTS >= 0.60 ? "bg-indigo-500" : "bg-indigo-500/50"} displayValue={(probs.PROB_BTTS * 100).toFixed(1) + '% \u00A0\u00A0 (@' + (odds.ODDS_BTTS?.toFixed(2) || '-') + ')'} />
          </div>
        </Card>
      </div>

      {/* Colonne 3: Scénarios Précis */}
      <div className="flex flex-col gap-6">
        <Card title="Scénarios Précis & Handicaps" titleIcon={<TrendingUp size={16} />}>
          <div className="flex flex-col gap-5 mt-1">
            
            {/* Asian Handicaps */}
            {match.Asian_Handicaps && (
              <div className="mb-6">
                <div className="text-xs uppercase text-slate-500 font-bold tracking-widest pb-2 mb-4 flex items-center justify-between border-b border-slate-800">
                  <span>Handicaps Asiatiques</span>
                  <Badge variant="info" className="text-[10px] px-2 py-0.5">Fav: {match.Asian_Handicaps.favorite}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(match.Asian_Handicaps).filter(([k]) => k.startsWith('AH_')).map(([k, v]) => (
                    <div key={k} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col items-center text-center shadow-inner">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5">{k.replace('_', ' ')}</span>
                      <div className="flex items-center justify-between w-full px-2 mt-1 border-t border-slate-800/50 pt-2">
                        <span className="text-xs font-bold text-slate-300">{(v.prob * 100).toFixed(1)}%</span>
                        <span className="font-mono text-xs text-emerald-400 font-bold">@{v.odds?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top 3 Scores */}
            {Object.keys(scores).length > 0 && (
              <div>
                <h4 className="text-xs uppercase text-slate-500 font-bold tracking-widest border-b border-slate-800 pb-2 mb-4 mt-2">Top 3 Scores Exacts</h4>
                <div className="flex flex-col gap-3">
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
              </div>
            )}

            {/* Alternative Domination */}
            {match.Alternative_Domination_Score && (
              <div className="pt-2">
                <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-widest border-b border-slate-800 pb-1 mb-3">Rupture Alternative</h4>
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-amber-500/20">
                    <span className="text-slate-300 text-[10px] uppercase tracking-wider">Avantage ({match.Alternative_Domination_Score.dominant_side})</span>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-slate-100 text-sm">{match.Alternative_Domination_Score.score}</span>
                      <Badge variant="warning" className="font-mono text-[9px]">@{match.Alternative_Domination_Score.odds?.toFixed(2)}</Badge>
                    </div>
                  </div>
                  <p className="text-[9px] text-amber-300/60 font-mono tracking-tight leading-relaxed">
                    Déclencheur : {match.Alternative_Domination_Score.trigger}
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </Card>
      </div>
    </div>
  );
}
